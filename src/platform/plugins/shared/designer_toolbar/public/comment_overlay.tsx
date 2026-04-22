/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useSyncExternalStore,
} from 'react';
import ReactDOM from 'react-dom';
import {
  EuiAvatar,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComment,
  EuiCommentList,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpStart } from '@kbn/core/public';
import {
  DESIGNER_UI_COMMENT_SO_TYPE,
  DESIGNER_COMMENTER_IDENTITY_KEY,
  DESIGNER_ANNOTATION_REQUEST_EVENT,
  DESIGNER_REMOVE_ALL_ANNOTATIONS_EVENT,
} from './constants';
import { designerAnnotationStore } from './designer_annotation_store';
import { isEditableKeyboardTarget, isPrimaryModifier } from './designer_shortcut_helpers';

// ─── Types ───────────────────────────────────────────────────────────────────

type AnchorType = 'testSubj' | 'id' | 'ariaLabel' | 'cssPath';
type AnnotationContext = 'page' | 'flyout' | 'modal';

interface Reply {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface Annotation {
  id: string;
  anchor: string;
  anchorType: AnchorType;
  anchorLabel: string;
  relativeX: number;
  relativeY: number;
  context: AnnotationContext;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  replies: Reply[];
  pathname: string;
}

interface SavedObjectAttributes {
  anchor: string;
  anchorType: AnchorType;
  anchorLabel: string;
  relativeX: number;
  relativeY: number;
  context: AnnotationContext;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  replies: Reply[];
  pathname: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const soToAnnotation = (so: { id: string; attributes: SavedObjectAttributes }): Annotation => ({
  id: so.id,
  anchor: so.attributes.anchor ?? '',
  anchorType: so.attributes.anchorType ?? 'cssPath',
  anchorLabel: so.attributes.anchorLabel ?? '',
  relativeX: so.attributes.relativeX ?? 0.5,
  relativeY: so.attributes.relativeY ?? 0,
  context: so.attributes.context ?? 'page',
  text: so.attributes.text,
  author: so.attributes.author,
  createdAt: so.attributes.createdAt,
  resolved: so.attributes.resolved,
  replies: so.attributes.replies ?? [],
  pathname: so.attributes.pathname ?? '',
});

const isLegacyAnnotation = (so: { attributes: Record<string, unknown> }): boolean =>
  !so.attributes.anchor && (so.attributes.clientX != null || so.attributes.selector != null);

const MAX_ANCHOR_AREA_RATIO = 0.4;

const isAnchorTooLarge = (node: Element): boolean => {
  const rect = node.getBoundingClientRect();
  const viewportArea = window.innerWidth * window.innerHeight;
  return (rect.width * rect.height) / viewportArea > MAX_ANCHOR_AREA_RATIO;
};

const isInsideFloating = (el: Element): boolean =>
  Boolean(el.closest('.euiFlyout') || el.closest('.euiModal'));

/**
 * Returns a scope (flyout/modal ancestor or document) that matches how the
 * annotation will later be resolved. We check uniqueness against this scope —
 * a `data-test-subj` that's unique within a flyout is a safe anchor even if
 * there's an identical one on the page, and vice versa.
 */
const searchRootFor = (el: Element): ParentNode =>
  el.closest('.euiFlyout') ?? el.closest('.euiModal') ?? document;

const isUniqueInScope = (el: Element, selector: string): boolean => {
  try {
    const root = searchRootFor(el);
    const matches = root.querySelectorAll(selector);
    let count = 0;
    for (const m of Array.from(matches)) {
      // Same-scope filter when searching the document: a page annotation should
      // ignore matches inside open flyouts/modals, matching resolveAnchorElement.
      if (root === document && isInsideFloating(m) && !isInsideFloating(el)) continue;
      count++;
      if (count > 1) return false;
    }
    return count === 1;
  } catch {
    return false;
  }
};

/**
 * Walk up from an element to find the best stable anchor.
 * Priority: data-test-subj > id > aria-label > CSS path fallback.
 * Candidates are skipped if they cover more than 40% of the viewport (relative
 * offsets on huge containers break across viewports) or if they aren't unique
 * in their scope (e.g. `dataGridRowCell` appears on every cell in a grid — we
 * need a more specific anchor to pick the right one).
 * Returns the resolved anchor element so the caller can compute offsets against it.
 */
const resolveAnchorFromElement = (
  el: Element
): { anchor: string; anchorType: AnchorType; anchorLabel: string; anchorEl: Element } => {
  let current: Element | null = el;
  let depth = 0;
  while (current && current !== document.body && depth < 10) {
    if (!isAnchorTooLarge(current)) {
      const testSubj = current.getAttribute('data-test-subj');
      if (
        testSubj &&
        !/["#[\]\\,]/.test(testSubj) &&
        isUniqueInScope(current, `[data-test-subj="${testSubj}"]`)
      ) {
        return {
          anchor: testSubj,
          anchorType: 'testSubj',
          anchorLabel: getElementLabel(current),
          anchorEl: current,
        };
      }

      const id = current.id;
      if (
        id &&
        !/^\d/.test(id) &&
        !id.startsWith('css-') &&
        !id.startsWith('react-') &&
        !id.startsWith(':') &&
        !id.startsWith('EuiPageTemplate') &&
        isUniqueInScope(current, `#${CSS.escape(id)}`)
      ) {
        return {
          anchor: id,
          anchorType: 'id',
          anchorLabel: getElementLabel(current),
          anchorEl: current,
        };
      }

      const ariaLabel = current.getAttribute('aria-label');
      if (
        ariaLabel &&
        ariaLabel.length > 2 &&
        ariaLabel.length < 100 &&
        isUniqueInScope(current, `[aria-label="${ariaLabel}"]`)
      ) {
        return {
          anchor: ariaLabel,
          anchorType: 'ariaLabel',
          anchorLabel: getElementLabel(current),
          anchorEl: current,
        };
      }
    }

    current = current.parentElement;
    depth++;
  }

  return {
    anchor: buildCssPath(el),
    anchorType: 'cssPath',
    anchorLabel: getElementLabel(el),
    anchorEl: el,
  };
};

const buildCssPath = (el: Element): string => {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body && parts.length < 5) {
    const tag = current.tagName.toLowerCase();
    const testSubj = current.getAttribute('data-test-subj');
    if (testSubj && !/["#[\]\\,]/.test(testSubj)) {
      parts.unshift(`[data-test-subj="${testSubj}"]`);
      break;
    }
    if (current.id && !/^\d/.test(current.id) && !current.id.startsWith('css-') &&
        !current.id.startsWith(':') && !current.id.startsWith('react-') &&
        !current.id.startsWith('EuiPageTemplate')) {
      parts.unshift(`#${current.id}`);
      break;
    }
    let part = tag;
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = current.parentElement;
  }
  return parts.join(' > ');
};

/**
 * Returns a search root for the annotation's context.
 * - `flyout`/`modal`: the open flyout/modal element, or `null` if none is open
 *   (null signals "dormant" — the pin should not render and the sidebar should
 *   show it as not-in-view).
 * - `page`: the document, excluding any open flyout/modal so a page annotation
 *   doesn't accidentally match an element inside a flyout that happens to
 *   share the same anchor.
 */
const resolveSearchScope = (
  ctx: AnnotationContext
): { root: ParentNode; excludeFloating: boolean } | null => {
  if (ctx === 'flyout') {
    const el = document.querySelector('.euiFlyout');
    return el ? { root: el, excludeFloating: false } : null;
  }
  if (ctx === 'modal') {
    const el = document.querySelector('.euiModal');
    return el ? { root: el, excludeFloating: false } : null;
  }
  return { root: document, excludeFloating: true };
};

const firstMatch = (
  nodes: NodeListOf<Element> | Element[],
  excludeFloating: boolean
): Element | null => {
  for (const node of Array.from(nodes)) {
    if (excludeFloating && isInsideFloating(node)) continue;
    return node;
  }
  return null;
};

const resolveAnchorElement = (ann: Annotation): Element | null => {
  try {
    const scope = resolveSearchScope(ann.context);
    if (!scope) return null;
    const { root, excludeFloating } = scope;
    switch (ann.anchorType) {
      case 'testSubj': {
        return firstMatch(
          root.querySelectorAll(`[data-test-subj="${ann.anchor}"]`),
          excludeFloating
        );
      }
      case 'id': {
        const el =
          root === document
            ? document.getElementById(ann.anchor)
            : (root as Element).querySelector(`#${CSS.escape(ann.anchor)}`);
        if (!el) return null;
        if (excludeFloating && isInsideFloating(el)) return null;
        return el;
      }
      case 'ariaLabel': {
        return firstMatch(
          root.querySelectorAll(`[aria-label="${ann.anchor}"]`),
          excludeFloating
        );
      }
      case 'cssPath': {
        return firstMatch(root.querySelectorAll(ann.anchor), excludeFloating);
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
};

const getAnnotationPinPosition = (
  ann: Annotation,
  el: Element
): { x: number; y: number } | null => {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    x: rect.left + ann.relativeX * rect.width,
    y: rect.top + ann.relativeY * rect.height,
  };
};

const detectContext = (el: Element): AnnotationContext => {
  if (el.closest('.euiFlyout')) return 'flyout';
  if (el.closest('.euiModal')) return 'modal';
  return 'page';
};

const getElementLabel = (el: Element): string => {
  const testSubj = el.getAttribute('data-test-subj');
  if (testSubj) return testSubj;
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  const text = el.textContent?.trim().slice(0, 40);
  if (text) return text;
  return el.tagName.toLowerCase();
};

const MEANINGFUL_TAGS = new Set(['button', 'input', 'select', 'textarea', 'a', 'img', 'video']);
const MEANINGFUL_ROLES = new Set([
  'button', 'link', 'checkbox', 'radio', 'switch', 'menuitem',
  'tab', 'combobox', 'searchbox', 'textbox', 'dialog', 'navigation',
]);

const isFlyoutChrome = (node: Element): boolean => {
  if (!(node instanceof HTMLElement)) return false;
  if (node.classList.contains('euiFlyout') || node.classList.contains('euiModal')) return true;
  const subj = node.getAttribute('data-test-subj');
  if (!subj) return false;
  return (
    subj === 'euiFlyoutBody' || subj.startsWith('euiFlyoutBody__') ||
    subj === 'euiModalBody' || subj.startsWith('euiModalBody__') ||
    subj.startsWith('euiFlyoutHeader') || subj.startsWith('euiFlyoutFooter')
  );
};

const findAnnotatableElement = (
  target: EventTarget | null,
  clientX?: number,
  clientY?: number
): Element | null => {
  if (clientX != null && clientY != null) {
    const fromStack = pickBestFlyoutElement(clientX, clientY);
    if (fromStack) return fromStack;
  }

  let el = target as Element | null;
  while (el && el !== document.body) {
    if (el.hasAttribute('data-annotation-overlay')) return null;
    const inFloating = Boolean(el.closest('.euiFlyout') || el.closest('.euiModal'));
    if (inFloating && isFlyoutChrome(el)) {
      el = el.parentElement;
      continue;
    }
    if (isSemanticCandidate(el, inFloating)) return el;
    el = el.parentElement;
  }
  return null;
};

const isSemanticCandidate = (node: Element, inFloating: boolean): boolean => {
  if (node.hasAttribute('data-annotation-overlay')) return false;
  if (inFloating && isFlyoutChrome(node)) return false;
  const rect = node.getBoundingClientRect();
  const tag = node.tagName.toLowerCase();
  const role = node.getAttribute('role') ?? '';
  const minW = inFloating ? 8 : 20;
  const minH = inFloating ? 8 : 16;
  if (rect.width < minW || rect.height < minH) return false;
  return (
    MEANINGFUL_TAGS.has(tag) ||
    MEANINGFUL_ROLES.has(role) ||
    node.hasAttribute('data-test-subj') ||
    rect.width >= 80
  );
};

const FLYOUT_INTERACTIVE_SELECTOR = [
  'input:not([type="hidden"])', 'textarea', 'button:not([type="hidden"])',
  'select', 'a[href]', '[contenteditable="true"]', '[role="switch"]',
  '[role="tab"]', '[role="button"]', '[role="link"]', '[role="textbox"]',
  '[role="combobox"]', '[role="searchbox"]', '[role="checkbox"]',
  '[role="radio"]', '[role="menuitem"]',
].join(', ');

const pickBestFlyoutElement = (clientX: number, clientY: number): Element | null => {
  const stack = document.elementsFromPoint(clientX, clientY);
  const candidates: Element[] = [];
  for (const node of stack) {
    if (!(node instanceof Element)) continue;
    if (node.hasAttribute('data-annotation-overlay')) continue;
    const shell = node.closest('.euiFlyout') ?? node.closest('.euiModal');
    if (!shell) continue;
    if (isFlyoutChrome(node)) continue;
    try {
      if (node.matches(FLYOUT_INTERACTIVE_SELECTOR)) {
        const r = node.getBoundingClientRect();
        if (clientX >= r.left - 6 && clientX <= r.right + 6 &&
            clientY >= r.top - 6 && clientY <= r.bottom + 6) {
          return node;
        }
      }
    } catch { /* ignore selector errors */ }
    if (isSemanticCandidate(node, true)) {
      const cr = node.getBoundingClientRect();
      if (clientX >= cr.left - 6 && clientX <= cr.right + 6 &&
          clientY >= cr.top - 6 && clientY <= cr.bottom + 6) {
        candidates.push(node);
      }
    }
  }
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestArea = Infinity;
  for (const c of candidates) {
    const r = c.getBoundingClientRect();
    const area = r.width * r.height;
    if (area < bestArea) {
      best = c;
      bestArea = area;
    }
  }
  return best;
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface AnnotationSidebarProps {
  annotations: Annotation[];
  currentPathname: string;
  showResolved: boolean;
  onToggleResolved: () => void;
  resolvedCount: number;
  onClickAnnotation: (id: string) => void;
  openAnnotationId: string | null;
}

const CONTEXT_LABELS: Record<AnnotationContext, string> = {
  page: 'Page',
  flyout: 'Flyout',
  modal: 'Modal',
};

const AnnotationSidebar: React.FC<AnnotationSidebarProps> = ({
  annotations,
  currentPathname,
  showResolved,
  onToggleResolved,
  resolvedCount,
  onClickAnnotation,
  openAnnotationId,
}) => {
  const { euiTheme } = useEuiTheme();

  const pageAnnotations = useMemo(
    () =>
      annotations
        .filter(
          (a) =>
            (!a.pathname || a.pathname === currentPathname) &&
            (showResolved || !a.resolved)
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [annotations, currentPathname, showResolved]
  );

  const resolvedByAnchor = useMemo(() => {
    const map = new Map<string, { el: Element | null; annotations: Annotation[] }>();
    for (const ann of pageAnnotations) {
      const key = `${ann.context}:${ann.anchorType}:${ann.anchor}`;
      if (!map.has(key)) {
        map.set(key, { el: resolveAnchorElement(ann), annotations: [] });
      }
      map.get(key)!.annotations.push(ann);
    }
    return map;
  }, [pageAnnotations]);

  if (pageAnnotations.length === 0) {
    return (
      <div css={css`padding: 12px 0;`}>
        <EuiText size="s" color="subdued" css={css`text-align: center;`}>
          <p>No annotations on this page</p>
        </EuiText>
      </div>
    );
  }

  return (
    <div css={css`max-height: 50vh; overflow-y: auto; padding: 4px 0;`}>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        css={css`padding: 0 4px 8px;`}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <strong>{pageAnnotations.length}</strong> annotation{pageAnnotations.length !== 1 ? 's' : ''}
          </EuiText>
        </EuiFlexItem>
        {resolvedCount > 0 && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" onClick={onToggleResolved}>
              {showResolved ? 'Hide resolved' : `Show resolved (${resolvedCount})`}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {Array.from(resolvedByAnchor.entries()).map(([key, { el, annotations: anns }]) => {
        const isDormant = el === null;
        const firstAnn = anns[0];

        return (
          <div
            key={key}
            css={css`
              border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
              padding: 6px 4px;
              &:last-child { border-bottom: none; }
            `}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={isDormant ? 'eyeClosed' : 'pinFilled'}
                  size="s"
                  color={isDormant ? 'subdued' : 'primary'}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color={isDormant ? 'subdued' : 'default'}>
                  <strong css={css`
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    display: block;
                    max-width: 200px;
                  `}>
                    {firstAnn.anchorLabel || firstAnn.anchor}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              {firstAnn.context !== 'page' && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {CONTEXT_LABELS[firstAnn.context]}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            {anns.map((ann, i) => (
              <button
                key={ann.id}
                onClick={() => onClickAnnotation(ann.id)}
                css={css`
                  display: block;
                  width: 100%;
                  text-align: left;
                  border: none;
                  background: ${openAnnotationId === ann.id
                    ? euiTheme.colors.backgroundBaseSubdued
                    : 'transparent'};
                  padding: 4px 4px 4px 20px;
                  cursor: ${isDormant ? 'default' : 'pointer'};
                  opacity: ${isDormant ? 0.6 : 1};
                  border-radius: 4px;
                  font-size: 12px;
                  color: ${ann.resolved ? euiTheme.colors.textSubdued : euiTheme.colors.text};
                  &:hover {
                    background: ${euiTheme.colors.backgroundBaseSubdued};
                  }
                `}
              >
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <span css={css`
                      width: 16px; height: 16px; border-radius: 50%;
                      background: ${ann.resolved
                        ? euiTheme.colors.textSubdued
                        : euiTheme.colors.backgroundFilledPrimary};
                      color: #fff; font-size: 9px; font-weight: 700;
                      display: flex; align-items: center; justify-content: center;
                    `}>
                      {i + 1}
                    </span>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <span css={css`
                      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                      text-decoration: ${ann.resolved ? 'line-through' : 'none'};
                    `}>
                      {ann.text}
                    </span>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">{ann.author}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export interface CommentOverlayProps {
  http: HttpStart;
}

export const CommentOverlay: React.FC<CommentOverlayProps> = ({ http }) => {
  const { euiTheme } = useEuiTheme();
  const seekTooltipShadow = useEuiShadow('s', { direction: 'down' });

  // Identity
  const [currentUser, setCurrentUser] = useState<string | null>(() =>
    localStorage.getItem(DESIGNER_COMMENTER_IDENTITY_KEY)
  );
  const [nameInput, setNameInput] = useState('');
  const [showIdentityPrompt, setShowIdentityPrompt] = useState(false);
  const pendingActivation = useRef(false);
  const currentUserRef = useRef<string | null>(currentUser);
  currentUserRef.current = currentUser;

  // Annotation mode state
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState('');
  const hoveredElRef = useRef<Element | null>(null);

  // Pending annotation (user clicked on an element but hasn't submitted text yet)
  const [pendingAnchor, setPendingAnchor] = useState<{
    anchor: string;
    anchorType: AnchorType;
    anchorLabel: string;
    relativeX: number;
    relativeY: number;
    context: AnnotationContext;
    el: Element;
  } | null>(null);

  const seekOverlayRef = useRef<HTMLDivElement | null>(null);

  // Annotations state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentPathname, setCurrentPathname] = useState(() => window.location.pathname);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newText, setNewText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openAnnotationId, setOpenAnnotationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [removeAllAnnotationsModalOpen, setRemoveAllAnnotationsModalOpen] = useState(false);
  const [removeAllAnnotationsInProgress, setRemoveAllAnnotationsInProgress] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Seek cursor (the comment icon following the mouse)
  const [seekCursor, setSeekCursor] = useState<{ x: number; y: number } | null>(null);
  const seekCursorRafRef = useRef<number | null>(null);
  const seekCursorPendingRef = useRef<{ x: number; y: number } | null>(null);

  const canvasVisible = useSyncExternalStore(
    designerAnnotationStore.subscribe,
    designerAnnotationStore.getCanvasVisible,
    designerAnnotationStore.getCanvasVisible
  );

  // Force re-render ticker for live pin positions.
  // Only reposition pins on scroll, resize, and coarse DOM changes (flyout
  // open/close). A longer debounce on mutations avoids the continuous
  // re-render storm that Kibana's busy DOM would otherwise cause.
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!canvasVisible) return;
    let rafId = 0;
    let debounce = 0;
    const bump = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => forceUpdate((n) => n + 1));
    };
    const debouncedBump = () => {
      clearTimeout(debounce);
      debounce = window.setTimeout(bump, 300);
    };
    const observer = new MutationObserver(debouncedBump);
    observer.observe(document.body, {
      childList: true,
      subtree: false,
    });
    window.addEventListener('resize', bump);
    const scrollEl = document.getElementById('app-main-scroll');
    if (scrollEl) scrollEl.addEventListener('scroll', bump, { passive: true });
    document.addEventListener('scroll', debouncedBump, true);
    return () => {
      clearTimeout(debounce);
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', bump);
      if (scrollEl) scrollEl.removeEventListener('scroll', bump);
      document.removeEventListener('scroll', debouncedBump, true);
    };
  }, [canvasVisible]);

  // Pathname tracking for SPA navigation
  useEffect(() => {
    const syncPathname = () => setCurrentPathname(window.location.pathname);
    window.addEventListener('popstate', syncPathname);
    const origPush = window.history.pushState.bind(window.history);
    const origReplace = window.history.replaceState.bind(window.history);
    window.history.pushState = (...args: Parameters<typeof origPush>) => {
      origPush(...args);
      syncPathname();
    };
    window.history.replaceState = (...args: Parameters<typeof origReplace>) => {
      origReplace(...args);
      syncPathname();
    };
    return () => {
      window.removeEventListener('popstate', syncPathname);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, []);

  // Load annotations — delete legacy (pre-anchor) entries in the background
  useEffect(() => {
    setLoading(true);
    http
      .get<{ saved_objects: Array<{ id: string; attributes: Record<string, unknown> }> }>(
        '/api/saved_objects/_find',
        { query: { type: DESIGNER_UI_COMMENT_SO_TYPE, per_page: 500 } }
      )
      .then(({ saved_objects }) => {
        const legacy = saved_objects.filter(isLegacyAnnotation);
        const current = saved_objects.filter((so) => !isLegacyAnnotation(so));
        setAnnotations(
          current.map((so) =>
            soToAnnotation(so as unknown as { id: string; attributes: SavedObjectAttributes })
          )
        );
        if (legacy.length > 0) {
          Promise.allSettled(
            legacy.map((so) =>
              http.delete(`/api/saved_objects/${DESIGNER_UI_COMMENT_SO_TYPE}/${so.id}`)
            )
          ).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [http]);

  // Seek cursor scheduling
  const flushSeekCursor = useCallback(() => {
    seekCursorRafRef.current = null;
    const pending = seekCursorPendingRef.current;
    if (pending) setSeekCursor(pending);
  }, []);

  const scheduleSeekCursor = useCallback(
    (clientX: number, clientY: number) => {
      seekCursorPendingRef.current = { x: clientX, y: clientY };
      if (seekCursorRafRef.current === null) {
        seekCursorRafRef.current = window.requestAnimationFrame(flushSeekCursor);
      }
    },
    [flushSeekCursor]
  );

  useEffect(() => {
    if (!canvasVisible || !isAnnotationMode || pendingAnchor) {
      if (seekCursorRafRef.current !== null) {
        window.cancelAnimationFrame(seekCursorRafRef.current);
        seekCursorRafRef.current = null;
      }
      seekCursorPendingRef.current = null;
      setSeekCursor(null);
    }
  }, [canvasVisible, isAnnotationMode, pendingAnchor]);

  // Activate annotation mode
  const activateAnnotationMode = useCallback(() => {
    designerAnnotationStore.setCanvasVisible(true);
    if (!currentUser) {
      pendingActivation.current = true;
      setShowIdentityPrompt(true);
    } else {
      setIsAnnotationMode((prev) => !prev);
      setPendingAnchor(null);
    }
  }, [currentUser]);

  useEffect(() => {
    const onEnterFromChrome = () => {
      designerAnnotationStore.setCanvasVisible(true);
      if (!currentUserRef.current) {
        pendingActivation.current = true;
        setShowIdentityPrompt(true);
        return;
      }
      setIsAnnotationMode(true);
      setPendingAnchor(null);
      setHoveredRect(null);
      hoveredElRef.current = null;
    };
    window.addEventListener(DESIGNER_ANNOTATION_REQUEST_EVENT, onEnterFromChrome);
    return () => window.removeEventListener(DESIGNER_ANNOTATION_REQUEST_EVENT, onEnterFromChrome);
  }, []);

  useEffect(() => {
    const onPromptRemoveAll = () => setRemoveAllAnnotationsModalOpen(true);
    window.addEventListener(DESIGNER_REMOVE_ALL_ANNOTATIONS_EVENT, onPromptRemoveAll);
    return () =>
      window.removeEventListener(DESIGNER_REMOVE_ALL_ANNOTATIONS_EVENT, onPromptRemoveAll);
  }, []);

  useEffect(() => {
    if (!canvasVisible) {
      setOpenAnnotationId(null);
      setReplyText('');
    }
  }, [canvasVisible]);

  useEffect(() => {
    if (!canvasVisible && isAnnotationMode) {
      setIsAnnotationMode(false);
      setPendingAnchor(null);
      setHoveredRect(null);
      hoveredElRef.current = null;
      setNewText('');
      setSaveError(null);
    }
  }, [canvasVisible, isAnnotationMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isEditableKeyboardTarget(e)) return;
      if (isPrimaryModifier(e) && e.key.toLowerCase() === 'k' && e.shiftKey && !e.altKey) {
        e.preventDefault();
        activateAnnotationMode();
      }
      if (e.key === 'Escape' && isAnnotationMode) {
        setIsAnnotationMode(false);
        setPendingAnchor(null);
        setHoveredRect(null);
        setNewText('');
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [activateAnnotationMode, isAnnotationMode]);

  // Seek handlers
  const handleSeekMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const overlay = seekOverlayRef.current;
      if (!overlay) return;
      overlay.style.pointerEvents = 'none';
      const underlying = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
      overlay.style.pointerEvents = 'all';
      const el = underlying ? findAnnotatableElement(underlying, e.clientX, e.clientY) : null;
      if (el !== hoveredElRef.current) {
        hoveredElRef.current = el;
        setHoveredRect(el ? el.getBoundingClientRect() : null);
        setHoveredLabel(el ? getElementLabel(el) : '');
      }
      scheduleSeekCursor(e.clientX, e.clientY);
    },
    [scheduleSeekCursor]
  );

  const handleSeekWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const overlay = seekOverlayRef.current;
    if (overlay) {
      overlay.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
      overlay.style.pointerEvents = 'all';
      const flyoutScrollPort =
        (under?.closest?.('.euiFlyoutBody__overflow') as HTMLElement | null) ??
        (under?.closest?.('.euiFlyoutBody__overflowContent') as HTMLElement | null) ??
        (under?.closest?.('.euiFlyoutBody') as HTMLElement | null);
      if (flyoutScrollPort) {
        flyoutScrollPort.scrollTop += e.deltaY;
        flyoutScrollPort.scrollLeft += e.deltaX;
        e.preventDefault();
        return;
      }
    }
    const scrollEl = document.getElementById('app-main-scroll');
    if (scrollEl) {
      scrollEl.scrollTop += e.deltaY;
      scrollEl.scrollLeft += e.deltaX;
    }
  }, []);

  const handleSeekClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const overlay = seekOverlayRef.current;
    if (!overlay) return;
    e.preventDefault();
    overlay.style.pointerEvents = 'none';
    const underlying = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
    overlay.style.pointerEvents = 'all';
    const el = underlying ? findAnnotatableElement(underlying, e.clientX, e.clientY) : null;
    if (!el) return;

    const anchorInfo = resolveAnchorFromElement(el);
    const anchorRect = anchorInfo.anchorEl.getBoundingClientRect();
    const relX = anchorRect.width > 0 ? Math.max(0, Math.min(1, (e.clientX - anchorRect.left) / anchorRect.width)) : 0.5;
    const relY = anchorRect.height > 0 ? Math.max(0, Math.min(1, (e.clientY - anchorRect.top) / anchorRect.height)) : 0.5;

    setPendingAnchor({
      ...anchorInfo,
      relativeX: relX,
      relativeY: relY,
      context: detectContext(anchorInfo.anchorEl),
      el: anchorInfo.anchorEl,
    });
    setHoveredRect(null);
    hoveredElRef.current = null;
  }, []);

  // Identity
  const submitIdentity = () => {
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem(DESIGNER_COMMENTER_IDENTITY_KEY, name);
    setCurrentUser(name);
    setShowIdentityPrompt(false);
    setNameInput('');
    if (pendingActivation.current) {
      pendingActivation.current = false;
      setIsAnnotationMode(true);
    }
  };

  // Save annotation
  const saveAnnotation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingAnchor || !newText.trim() || !currentUser) return;
    setSaveError(null);
    const attributes: SavedObjectAttributes = {
      anchor: pendingAnchor.anchor,
      anchorType: pendingAnchor.anchorType,
      anchorLabel: pendingAnchor.anchorLabel,
      relativeX: pendingAnchor.relativeX,
      relativeY: pendingAnchor.relativeY,
      context: pendingAnchor.context,
      text: newText.trim(),
      author: currentUser,
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: [],
      pathname: window.location.pathname,
    };
    setSaving(true);
    try {
      const created = await http.post<unknown>(
        `/api/saved_objects/${DESIGNER_UI_COMMENT_SO_TYPE}`,
        { body: JSON.stringify({ attributes }) }
      );
      if (
        !created || typeof created !== 'object' ||
        !('id' in created) || !('attributes' in created) ||
        typeof (created as { id: unknown }).id !== 'string' ||
        typeof (created as { attributes: unknown }).attributes !== 'object'
      ) {
        throw new Error('Unexpected response when saving annotation');
      }
      setAnnotations((prev) => [
        ...prev,
        soToAnnotation(created as { id: string; attributes: SavedObjectAttributes }),
      ]);
      setPendingAnchor(null);
      setNewText('');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[DesignerCommentOverlay] Failed to save annotation:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Check console.');
    } finally {
      setSaving(false);
    }
  };

  // CRUD operations
  const toggleResolved = async (id: string) => {
    const ann = annotations.find((a) => a.id === id);
    if (!ann) return;
    const updated = { ...ann, resolved: !ann.resolved };
    setAnnotations((prev) => prev.map((a) => (a.id === id ? updated : a)));
    await http
      .put(`/api/saved_objects/${DESIGNER_UI_COMMENT_SO_TYPE}/${id}`, {
        body: JSON.stringify({ attributes: { resolved: updated.resolved } }),
      })
      .catch(() => setAnnotations((prev) => prev.map((a) => (a.id === id ? ann : a))));
    setOpenAnnotationId(null);
  };

  const deleteAnnotation = async (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (openAnnotationId === id) setOpenAnnotationId(null);
    await http.delete(`/api/saved_objects/${DESIGNER_UI_COMMENT_SO_TYPE}/${id}`).catch(() => {});
  };

  const confirmRemoveAllAnnotations = useCallback(async () => {
    const ids = annotations.map((a) => a.id);
    if (ids.length === 0) {
      setRemoveAllAnnotationsModalOpen(false);
      return;
    }
    setRemoveAllAnnotationsInProgress(true);
    try {
      await Promise.allSettled(
        ids.map((id) => http.delete(`/api/saved_objects/${DESIGNER_UI_COMMENT_SO_TYPE}/${id}`))
      );
      const { saved_objects } = await http.get<{
        saved_objects: Array<{ id: string; attributes: Record<string, unknown> }>;
      }>('/api/saved_objects/_find', {
        query: { type: DESIGNER_UI_COMMENT_SO_TYPE, per_page: 500 },
      });
      setAnnotations(
        saved_objects.map((so) =>
          soToAnnotation(so as unknown as { id: string; attributes: SavedObjectAttributes })
        )
      );
      setOpenAnnotationId(null);
      setReplyText('');
    } catch { /* list may be stale */ } finally {
      setRemoveAllAnnotationsInProgress(false);
      setRemoveAllAnnotationsModalOpen(false);
    }
  }, [annotations, http]);

  const addReply = async (annotationId: string) => {
    if (!replyText.trim() || !currentUser) return;
    const ann = annotations.find((a) => a.id === annotationId);
    if (!ann) return;
    const newReply: Reply = {
      id: generateId(),
      text: replyText.trim(),
      author: currentUser,
      createdAt: new Date().toISOString(),
    };
    const updatedReplies = [...ann.replies, newReply];
    setAnnotations((prev) =>
      prev.map((a) => (a.id === annotationId ? { ...a, replies: updatedReplies } : a))
    );
    setReplyText('');
    await http
      .put(`/api/saved_objects/${DESIGNER_UI_COMMENT_SO_TYPE}/${annotationId}`, {
        body: JSON.stringify({ attributes: { replies: updatedReplies } }),
      })
      .catch(() =>
        setAnnotations((prev) =>
          prev.map((a) => (a.id === annotationId ? { ...a, replies: ann.replies } : a))
        )
      );
  };

  // Derived state
  const resolvedCount = annotations.filter((a) => a.resolved).length;
  const pageAnnotations = annotations.filter(
    (a) =>
      (!a.pathname || a.pathname === currentPathname) &&
      (showResolved || !a.resolved)
  );

  const labelIndexByAnnotationId = useMemo(
    () =>
      new Map(
        [...annotations]
          .filter(
            (a) =>
              (!a.pathname || a.pathname === currentPathname) && (showResolved || !a.resolved)
          )
          .sort((a, b) => {
            const ta = new Date(a.createdAt).getTime();
            const tb = new Date(b.createdAt).getTime();
            if (ta !== tb) return ta - tb;
            return a.id.localeCompare(b.id);
          })
          .map((a, i) => [a.id, i + 1] as const)
      ),
    [annotations, currentPathname, showResolved]
  );

  // Pin position for the pending annotation
  const pendingPinPosition = useMemo(() => {
    if (!pendingAnchor) return null;
    const rect = pendingAnchor.el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return {
      x: rect.left + pendingAnchor.relativeX * rect.width,
      y: rect.top + pendingAnchor.relativeY * rect.height,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAnchor, /* force re-render ticker recomputes positions */]);

  const maxFloatingZ = (() => {
    let max = 0;
    const consider = (node: Element) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.getClientRects().length === 0) return;
      const raw = getComputedStyle(node).zIndex;
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && raw !== 'auto') max = Math.max(max, parsed);
    };
    document.querySelectorAll('.euiFlyout, .euiModal, .euiOverlayMask').forEach(consider);
    return max;
  })();

  const annotationModeChromeZ = Math.max(Number(euiTheme.levels.toast) - 1, maxFloatingZ + 50);

  // Composer positioning
  const composerPosition = useMemo(() => {
    if (!pendingPinPosition) return null;
    const leftClamped = Math.min(Math.max(12, pendingPinPosition.x - 160), window.innerWidth - 328);
    const roomBelow = window.innerHeight - pendingPinPosition.y - 20;
    if (roomBelow > 60) {
      return { top: pendingPinPosition.y + 16, left: leftClamped };
    }
    return { top: Math.max(8, pendingPinPosition.y - 56), left: leftClamped };
  }, [pendingPinPosition]);

  const handleSidebarAnnotationClick = useCallback((id: string) => {
    const ann = annotations.find((a) => a.id === id);
    if (!ann) return;
    const el = resolveAnchorElement(ann);
    if (el) {
      setOpenAnnotationId((prev) => (prev === id ? null : id));
    }
  }, [annotations]);

  return ReactDOM.createPortal(
    <>
      {/* Identity prompt */}
      {showIdentityPrompt && (
        <div
          data-annotation-overlay="true"
          css={css`
            position: fixed; inset: 0; z-index: 10010;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0, 0, 0, 0.4);
          `}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowIdentityPrompt(false);
              pendingActivation.current = false;
            }
          }}
          onKeyDown={(e) => {
            if (e.target === e.currentTarget && e.key === 'Escape') {
              setShowIdentityPrompt(false);
              pendingActivation.current = false;
            }
          }}
        >
          <div css={css`
            background: ${euiTheme.colors.backgroundBasePlain};
            border-radius: 10px; padding: 28px 32px; width: 340px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          `}>
            <EuiTitle size="s"><h3>What&apos;s your name?</h3></EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>Your name will appear on annotations you add. Only asked once.</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFieldText
              data-test-subj="designerToolbarCommentOverlayNameInput"
              placeholder="e.g. Sarah"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              fullWidth autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitIdentity();
                if (e.key === 'Escape') {
                  setShowIdentityPrompt(false);
                  pendingActivation.current = false;
                }
              }}
            />
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="designerToolbarCommentOverlayCancelButton"
                  size="s"
                  onClick={() => {
                    setShowIdentityPrompt(false);
                    pendingActivation.current = false;
                  }}
                >
                  Cancel
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="designerToolbarCommentOverlayContinueButton"
                  size="s" fill
                  onClick={submitIdentity}
                  isDisabled={!nameInput.trim()}
                >
                  Continue
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      )}

      {/* Remove all modal */}
      {removeAllAnnotationsModalOpen ? (
        <EuiConfirmModal
          data-test-subj="designerToolbarRemoveAllAnnotationsModal"
          title="Remove all annotations?"
          onCancel={() => {
            if (removeAllAnnotationsInProgress) return;
            setRemoveAllAnnotationsModalOpen(false);
          }}
          onConfirm={confirmRemoveAllAnnotations}
          cancelButtonText="Cancel"
          confirmButtonText="Remove all"
          buttonColor="danger"
          defaultFocusedButton="cancel"
          isLoading={removeAllAnnotationsInProgress}
          confirmButtonDisabled={annotations.length === 0}
        >
          {annotations.length === 0 ? (
            <p>There are no annotations to remove.</p>
          ) : (
            <p>
              Permanently delete all {annotations.length}{' '}
              {annotations.length === 1 ? 'annotation' : 'annotations'}? You cannot undo this.
            </p>
          )}
        </EuiConfirmModal>
      ) : null}

      {/* Hover highlight during seek */}
      {canvasVisible && isAnnotationMode && hoveredRect && (
        <div
          data-annotation-overlay="true"
          css={css`
            position: fixed;
            top: ${hoveredRect.top}px; left: ${hoveredRect.left}px;
            width: ${hoveredRect.width}px; height: ${hoveredRect.height}px;
            border: 2px solid ${euiTheme.colors.backgroundFilledPrimary};
            background: rgba(0, 102, 255, 0.03);
            border-radius: 4px; pointer-events: none;
            z-index: ${annotationModeChromeZ + 2}; box-sizing: border-box;
          `}
        >
          <span css={css`
            position: absolute; top: -22px; left: 0;
            background: ${euiTheme.colors.backgroundFilledPrimary};
            color: #fff; font-size: 10px; padding: 2px 6px;
            border-radius: 4px 4px 4px 0;
            white-space: nowrap; max-width: 200px;
            overflow: hidden; text-overflow: ellipsis;
          `}>
            {hoveredLabel}
          </span>
        </div>
      )}

      {/* Seek overlay (full-screen transparent click catcher) */}
      {canvasVisible && isAnnotationMode && !pendingAnchor && (
        <div
          ref={seekOverlayRef}
          data-annotation-overlay="true"
          onPointerEnter={(e) => scheduleSeekCursor(e.clientX, e.clientY)}
          onMouseMove={handleSeekMouseMove}
          onClick={handleSeekClick}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsAnnotationMode(false);
              setPendingAnchor(null);
              setHoveredRect(null);
              setNewText('');
            }
          }}
          onWheel={handleSeekWheel}
          css={css`
            position: fixed; inset: 0;
            z-index: ${annotationModeChromeZ}; cursor: none;
          `}
        >
          {seekCursor ? (
            <div
              aria-hidden
              css={css`
                position: fixed;
                left: ${seekCursor.x}px; top: ${seekCursor.y}px;
                transform: translate(10px, 6px);
                z-index: ${annotationModeChromeZ + 2}; pointer-events: none;
              `}
            >
              <div css={css`
                display: flex; align-items: center; justify-content: center;
                padding: 5px; border-radius: ${euiTheme.border.radius.medium};
                background: ${euiTheme.colors.emptyShade};
                ${seekTooltipShadow}
              `}>
                <EuiIcon type="discuss" size="m" color="primary" />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Composer input (appears after clicking an element) */}
      {canvasVisible && isAnnotationMode && pendingAnchor && composerPosition && (
        <div
          data-annotation-overlay="true"
          data-no-focus-lock
          onMouseDown={(evt) => evt.stopPropagation()}
          onPointerDown={(evt) => evt.stopPropagation()}
          css={css`
            position: fixed;
            top: ${composerPosition.top}px;
            left: ${composerPosition.left}px;
            z-index: ${annotationModeChromeZ + 6};
            pointer-events: auto;
          `}
        >
          <form onSubmit={saveAnnotation}>
            <EuiFlexGroup
              gutterSize="s" alignItems="center" responsive={false}
              css={css`
                background: ${euiTheme.colors.backgroundBasePlain};
                border-radius: 999px; padding: 6px 6px 6px 10px;
                width: 320px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiAvatar
                  name={currentUser ?? 'You'} size="s"
                  color={euiTheme.colors.backgroundFilledPrimary}
                  css={css`color: #fff !important;`}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldText
                  data-test-subj="designerToolbarCommentOverlayAnnotationInput"
                  placeholder="Add annotation…"
                  value={newText}
                  onChange={(evt) => setNewText(evt.target.value)}
                  autoFocus compressed fullWidth
                  onKeyDown={(evt) => {
                    if (evt.key === 'Enter' && !evt.shiftKey) {
                      evt.preventDefault();
                      saveAnnotation();
                    }
                    if (evt.key === 'Escape') {
                      setPendingAnchor(null);
                      setNewText('');
                      setSaveError(null);
                    }
                  }}
                  css={css`
                    border: none !important; box-shadow: none !important;
                    background: transparent !important; padding-left: 4px !important;
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <button
                  type="submit"
                  disabled={!newText.trim() || saving}
                  onClick={(evt) => { evt.preventDefault(); saveAnnotation(); }}
                  css={css`
                    border: none; border-radius: 50%;
                    width: 32px; height: 32px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; font-size: 16px; line-height: 1;
                    cursor: ${newText.trim() && !saving ? 'pointer' : 'default'};
                    background: ${newText.trim()
                      ? euiTheme.colors.backgroundFilledPrimary
                      : euiTheme.colors.backgroundBaseSubdued};
                    color: ${newText.trim() ? '#fff' : euiTheme.colors.textSubdued};
                    transition: opacity 0.15s ease;
                    &:disabled { opacity: 0.5; }
                    &:not(:disabled):hover { opacity: 0.85; }
                  `}
                >
                  {saving ? '…' : '↑'}
                </button>
              </EuiFlexItem>
            </EuiFlexGroup>
          </form>
          {saveError && (
            <div css={css`
              margin-top: 6px; padding: 6px 12px;
              background: ${euiTheme.colors.backgroundFilledDanger};
              color: #fff; border-radius: 6px; font-size: 12px; max-width: 320px;
            `}>
              {saveError}
            </div>
          )}
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div css={css`position: fixed; bottom: 20px; right: 20px; z-index: 10001;`}>
          <EuiLoadingSpinner size="m" />
        </div>
      )}

      {/* Sidebar toggle */}
      {canvasVisible && !loading && pageAnnotations.length > 0 && (
        <div
          data-annotation-overlay="true"
          css={css`
            position: fixed; bottom: 80px; right: 24px; z-index: 10001;
          `}
        >
          <EuiPopover
            isOpen={sidebarOpen}
            closePopover={() => setSidebarOpen(false)}
            anchorPosition="upRight"
            panelPaddingSize="s"
            panelStyle={{ width: 340 }}
            button={
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                css={css`
                  background: ${euiTheme.colors.backgroundBasePlain};
                  border: 1px solid ${euiTheme.colors.borderBaseSubdued};
                  border-radius: 8px; padding: 4px 12px;
                  font-size: 12px; cursor: pointer;
                  color: ${euiTheme.colors.textSubdued};
                  white-space: nowrap; display: flex; align-items: center; gap: 6px;
                  &:hover { background: ${euiTheme.colors.backgroundBaseSubdued}; }
                `}
              >
                <EuiIcon type="list" size="s" />
                {pageAnnotations.length} annotation{pageAnnotations.length !== 1 ? 's' : ''}
              </button>
            }
          >
            <AnnotationSidebar
              annotations={annotations}
              currentPathname={currentPathname}
              showResolved={showResolved}
              onToggleResolved={() => setShowResolved((v) => !v)}
              resolvedCount={resolvedCount}
              onClickAnnotation={handleSidebarAnnotationClick}
              openAnnotationId={openAnnotationId}
            />
          </EuiPopover>
        </div>
      )}

      {/* Annotation pins */}
      {canvasVisible && !loading && pageAnnotations.map((ann) => {
        const el = resolveAnchorElement(ann);
        if (!el) return null;
        const pin = getAnnotationPinPosition(ann, el);
        if (!pin) return null;

        const elRect = el.getBoundingClientRect();
        if (elRect.width === 0 && elRect.height === 0) return null;

        const labelIndex = labelIndexByAnnotationId.get(ann.id) ?? 1;
        const pinZ = el.closest('.euiFlyout') || el.closest('.euiModal')
          ? maxFloatingZ + 10
          : 9998;

        return (
          <div
            key={ann.id}
            data-annotation-overlay="true"
            css={css`
              position: fixed;
              top: ${pin.y}px; left: ${pin.x}px;
              pointer-events: auto; z-index: ${pinZ};
            `}
          >
            {/* Dashed outline around the anchor element */}
            <div css={css`
              position: fixed;
              top: ${elRect.top}px; left: ${elRect.left}px;
              width: ${elRect.width}px; height: ${elRect.height}px;
              border: 1.5px dashed ${ann.resolved
                ? euiTheme.colors.textSubdued
                : euiTheme.colors.backgroundFilledPrimary};
              border-radius: 4px; pointer-events: none;
              opacity: ${openAnnotationId === ann.id ? 0.6 : 0.25};
              box-sizing: border-box;
              transition: opacity 0.15s ease;
            `} />

            <EuiPopover
              isOpen={openAnnotationId === ann.id}
              closePopover={() => { setOpenAnnotationId(null); setReplyText(''); }}
              panelPaddingSize="m"
              panelStyle={{ width: 320 }}
              zIndex={pinZ + 20}
              button={
                <button
                  data-annotation-overlay="true"
                  onClick={() =>
                    setOpenAnnotationId(openAnnotationId === ann.id ? null : ann.id)
                  }
                  css={css`
                    width: 24px; height: 24px; border-radius: 50%;
                    background: ${ann.resolved
                      ? euiTheme.colors.textSubdued
                      : euiTheme.colors.backgroundFilledPrimary};
                    border: 2px solid #fff; cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
                    display: flex; align-items: center; justify-content: center;
                    transform: translate(-50%, -50%);
                    transition: box-shadow 0.15s ease, transform 0.15s ease;
                    &:hover {
                      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                      transform: translate(-50%, -50%) scale(1.2);
                    }
                  `}
                >
                  <span css={css`
                    color: #fff; font-size: 10px; font-weight: 700; line-height: 1;
                  `}>
                    {labelIndex}
                  </span>
                </button>
              }
            >
              <EuiCommentList aria-label={`Annotation ${labelIndex}`}>
                <EuiComment
                  username={ann.author}
                  timestamp={new Date(ann.createdAt).toLocaleString()}
                  event="annotated"
                  actions={
                    <EuiButtonIcon
                      data-test-subj="designerToolbarAnnotationDeleteButton"
                      iconType="trash" color="danger" size="xs"
                      aria-label="Delete annotation"
                      onClick={() => deleteAnnotation(ann.id)}
                    />
                  }
                >
                  <EuiText size="s"><p>{ann.text}</p></EuiText>
                </EuiComment>
                {ann.replies.map((reply) => (
                  <EuiComment
                    key={reply.id}
                    username={reply.author}
                    timestamp={new Date(reply.createdAt).toLocaleString()}
                    event="replied"
                  >
                    <EuiText size="s"><p>{reply.text}</p></EuiText>
                  </EuiComment>
                ))}
              </EuiCommentList>
              <EuiSpacer size="s" />
              <EuiTextArea
                data-test-subj="designerToolbarAnnotationReplyInput"
                placeholder="Reply… (Ctrl+Enter to send)"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2} fullWidth
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addReply(ann.id);
                }}
              />
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiButtonEmpty
                    data-test-subj="designerToolbarAnnotationResolveButton"
                    size="s"
                    iconType={ann.resolved ? 'refresh' : 'checkInCircleFilled'}
                    color={ann.resolved ? 'text' : 'success'}
                    onClick={() => toggleResolved(ann.id)}
                  >
                    {ann.resolved ? 'Reopen' : 'Resolve'}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="designerToolbarAnnotationReplyButton"
                    size="s" fill
                    isDisabled={!replyText.trim()}
                    onClick={() => addReply(ann.id)}
                  >
                    Reply
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopover>
          </div>
        );
      })}

      {/* Pending annotation highlight */}
      {canvasVisible && isAnnotationMode && pendingAnchor && (() => {
        const rect = pendingAnchor.el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return null;
        return (
          <div
            data-annotation-overlay="true"
            css={css`
              position: fixed;
              top: ${rect.top}px; left: ${rect.left}px;
              width: ${rect.width}px; height: ${rect.height}px;
              border: 2px solid ${euiTheme.colors.backgroundFilledPrimary};
              border-radius: 4px; pointer-events: none;
              z-index: ${annotationModeChromeZ + 4}; box-sizing: border-box;
            `}
          />
        );
      })()}
    </>,
    document.body
  );
};
