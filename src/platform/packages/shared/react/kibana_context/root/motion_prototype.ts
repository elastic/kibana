/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { useEuiTheme } from '@elastic/eui';
import {
  getMotionRefreshSettings,
  subscribeMotionRefreshSettings,
  type MotionRefreshSettings,
} from './motion_settings';
import { resolveMotionTokens, type MotionTokens } from './motion_tokens';

const TAB_INDICATOR_CLASS = 'kbnTabIndicator';
const STYLE_ELEMENT_ID = 'kbn-motion-prototype';

/** 5×6 triangle from the motion study. Points right, so a 90° turn aims it down. */
const ACCORDION_ARROW_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 5 6'><path fill='black' d='M0.790274 5.9233C0.439968 6.13988 0 5.87205 0 5.44212V0.557893C0 0.127959 0.439968 -0.139906 0.790274 0.0767213L4.7393 2.51882C5.08695 2.73378 5.08695 3.26621 4.7393 3.48116L0.790274 5.9233Z'/></svg>`
)}")`;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Page enter length for inspection. This is not an EUI motion token. */
export const PAGE_ENTER_DURATION = '1.5s';

/** Spinner spin length. EUI uses 0.6s; this is 25% slower. */
export const SPINNER_DURATION = '0.75s';

/**
 * Prototype motions mounted once for the whole Kibana UI.
 * Tooltips reuse the popover reveal. Tab bars slide one indicator between selections.
 * Accordions rotate a custom arrow glyph and slide their content open.
 * Callouts and banners fade and collapse their height only when dismissed.
 * Switching apps fades the new page in and lifts its content blocks a short distance.
 * Every loading spinner keeps its spin and paints the ring as a primary-to-teal blend.
 * The log in screen uses the boot pattern behind /login and /mock_idp/login.
 */
export const MotionPrototype = () => {
  const { euiTheme, highContrastMode } = useEuiTheme();
  const tokens = resolveMotionTokens(euiTheme, Boolean(highContrastMode));
  const tokensKey = JSON.stringify(tokens);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    return retainMotionPrototype(JSON.parse(tokensKey) as MotionTokens);
  }, [tokensKey]);

  return null;
};

let ownerCount = 0;
let stopPrototype: (() => void) | undefined;

const retainMotionPrototype = (tokens: MotionTokens): (() => void) => {
  ownerCount += 1;
  if (!stopPrototype) {
    stopPrototype = startMotionPrototype(tokens);
  } else {
    updateMotionCss(tokens);
  }

  return () => {
    ownerCount -= 1;
    if (ownerCount === 0) {
      stopPrototype?.();
      stopPrototype = undefined;
    }
  };
};

let motionTokens: MotionTokens | undefined;
let styleElement: HTMLStyleElement | undefined;
let stopTabs: (() => void) | undefined;
let stopCallouts: (() => void) | undefined;
let stopPages: (() => void) | undefined;
let stopLogin: (() => void) | undefined;

const applyMotionPrototype = () => {
  if (!styleElement || !motionTokens) return;

  const settings = getMotionRefreshSettings();
  styleElement.textContent = buildMotionCss(motionTokens, settings);

  const motionAllowed = !window.matchMedia(REDUCED_MOTION_QUERY).matches;
  const tabsOn = settings.tabs && motionAllowed;
  if (tabsOn && !stopTabs) {
    stopTabs = startTabIndicator();
  } else if (!tabsOn && stopTabs) {
    stopTabs();
    stopTabs = undefined;
  }

  const calloutsOn = settings.callout && motionAllowed;
  if (calloutsOn && !stopCallouts) {
    stopCallouts = startCalloutMotion(motionTokens);
  } else if (!calloutsOn && stopCallouts) {
    stopCallouts();
    stopCallouts = undefined;
  }

  const pagesOn = settings.page && motionAllowed;
  if (pagesOn && !stopPages) {
    stopPages = startPageMotion();
  } else if (!pagesOn && stopPages) {
    stopPages();
    stopPages = undefined;
  }

  if (settings.login && !stopLogin) {
    stopLogin = startLoginPattern();
  } else if (!settings.login && stopLogin) {
    stopLogin();
    stopLogin = undefined;
  }
};

const startMotionPrototype = (tokens: MotionTokens): (() => void) => {
  motionTokens = tokens;
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  styleElement = style;
  document.head.appendChild(style);
  document.documentElement.setAttribute(
    'data-kbn-motion-prototype',
    'tooltip-tabs-accordion-callout-page-spinner'
  );
  applyMotionPrototype();
  const unsubscribe = subscribeMotionRefreshSettings(applyMotionPrototype);

  return () => {
    unsubscribe();
    stopTabs?.();
    stopTabs = undefined;
    stopCallouts?.();
    stopCallouts = undefined;
    stopPages?.();
    stopPages = undefined;
    stopLogin?.();
    stopLogin = undefined;
    style.remove();
    styleElement = undefined;
    motionTokens = undefined;
    document.documentElement.removeAttribute('data-kbn-motion-prototype');
  };
};

const updateMotionCss = (tokens: MotionTokens) => {
  motionTokens = tokens;
  applyMotionPrototype();
};

/**
 * Popover panels fade with `slow` + `bounce` and drift `size.s` on a transform that lasts 100ms longer.
 * Tooltips wait `extraFast`, then play that same reveal, plus the study's slight scale.
 */
const buildMotionCss = (tokens: MotionTokens, settings: MotionRefreshSettings): string => {
  const {
    drift,
    opacityDuration,
    transformDuration,
    popoverEasing,
    tooltipDelay,
    tabDuration,
    tabEasing,
    indicatorColor,
    indicatorDisabledColor,
    indicatorThickness,
    accordionDuration,
    accordionEasing,
    calloutDuration,
    calloutEasing,
    pageEasing,
    pageRise,
    spinnerPrimary,
    spinnerTeal,
  } = tokens;

  const tooltipCss = settings.tooltip
    ? `
  @keyframes kbnTipFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes kbnTipFromTop {
    from { transform: translateY(${drift}) scale(0.92); }
    to { transform: none; }
  }
  @keyframes kbnTipFromBottom {
    from { transform: translateY(calc(${drift} * -1)) scale(0.92); }
    to { transform: none; }
  }
  @keyframes kbnTipFromLeft {
    from { transform: translateX(${drift}) scale(0.92); }
    to { transform: none; }
  }
  @keyframes kbnTipFromRight {
    from { transform: translateX(calc(${drift} * -1)) scale(0.92); }
    to { transform: none; }
  }

  .euiToolTipPopover[data-position] {
    animation-duration: ${opacityDuration}, ${transformDuration} !important;
    animation-timing-function: ${popoverEasing}, ${popoverEasing} !important;
    animation-delay: ${tooltipDelay}, ${tooltipDelay} !important;
    animation-fill-mode: both, forwards !important;
    animation-iteration-count: 1, 1 !important;
  }
  .euiToolTipPopover[data-position='top'] { animation-name: kbnTipFade, kbnTipFromTop !important; }
  .euiToolTipPopover[data-position='bottom'] { animation-name: kbnTipFade, kbnTipFromBottom !important; }
  .euiToolTipPopover[data-position='left'] { animation-name: kbnTipFade, kbnTipFromLeft !important; }
  .euiToolTipPopover[data-position='right'] { animation-name: kbnTipFade, kbnTipFromRight !important; }
`
    : '';

  const tabsCss = settings.tabs
    ? `
  .euiTabs .euiTab {
    transition: color ${tabDuration} ${tabEasing};
  }
  .euiTabs .euiTab-isSelected::after {
    border-color: transparent !important;
  }
  .${TAB_INDICATOR_CLASS} {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 1px;
    height: ${indicatorThickness};
    background: ${indicatorColor};
    pointer-events: none;
    z-index: 1;
    transform-origin: left center;
    transition: transform ${tabDuration} ${tabEasing};
    will-change: transform;
  }
  .${TAB_INDICATOR_CLASS}[data-disabled] {
    background: ${indicatorDisabledColor};
  }
`
    : '';

  const accordionCss = settings.accordion
    ? `
  /* Keep the accordion hit target still. Only the triangle glyph turns. */
  .euiAccordion .euiAccordion__arrow {
    position: relative;
    transform: none !important;
  }
  .euiAccordion__arrow .euiButtonIcon__icon {
    visibility: hidden;
  }
  .euiAccordion__arrow::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 5px;
    height: 6px;
    margin: auto;
    background-color: currentColor;
    -webkit-mask: ${ACCORDION_ARROW_MASK} center / contain no-repeat;
    mask: ${ACCORDION_ARROW_MASK} center / contain no-repeat;
    opacity: 0.7;
    transform: rotate(0deg);
    transition: transform ${accordionDuration} ${accordionEasing}, opacity ${accordionDuration} ${accordionEasing};
    pointer-events: none;
  }
  .euiAccordion-isOpen .euiAccordion__arrow::after {
    transform: rotate(90deg);
    opacity: 1;
  }
  .euiAccordion__children {
    transition: transform ${accordionDuration} ${accordionEasing};
  }
  .euiAccordion:not(.euiAccordion-isOpen) .euiAccordion__children {
    transform: translateY(calc(${drift} * -1));
  }
`
    : '';

  const calloutCss = settings.callout
    ? `
  [data-kbn-callout-motion='exit'] {
    overflow: hidden;
    box-sizing: border-box;
    min-height: 0;
    transition:
      height ${calloutDuration} ${calloutEasing},
      opacity ${calloutDuration} ${calloutEasing},
      padding-top ${calloutDuration} ${calloutEasing},
      padding-bottom ${calloutDuration} ${calloutEasing},
      margin-top ${calloutDuration} ${calloutEasing},
      margin-bottom ${calloutDuration} ${calloutEasing},
      border-top-width ${calloutDuration} ${calloutEasing},
      border-bottom-width ${calloutDuration} ${calloutEasing};
  }
  [data-kbn-callout-motion='exit'] {
    pointer-events: none;
  }
`
    : '';

  const pageCss = settings.page
    ? `
  @keyframes kbnPageEnter {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes kbnPageRise {
    from { transform: translateY(${pageRise}); }
    to { transform: none; }
  }
  .kbnAppWrapper[data-kbn-page-enter='hold'] {
    opacity: 0;
  }
  .kbnAppWrapper[data-kbn-page-enter='enter'] {
    animation: kbnPageEnter ${PAGE_ENTER_DURATION} ${pageEasing} both;
  }
  .kbnAppWrapper[data-kbn-page-enter='enter'] > * > * {
    animation: kbnPageRise ${PAGE_ENTER_DURATION} ${pageEasing} both;
  }
`
    : '';

  // Every EuiLoadingSpinner already rotates. This slows that spin by 25%
  // and repaints the ring. Primary is held 45° each side of the seam, so the
  // primary stretch is 225° — 25% longer than half the ring — then it fades
  // to teal and back. The mask keeps each size's own border width.
  const spinnerCss = settings.spinner
    ? `
  .euiLoadingSpinner {
    border-color: transparent !important;
    animation-duration: ${SPINNER_DURATION} !important;
    background: conic-gradient(
      from 0deg,
      ${spinnerPrimary} 0deg,
      ${spinnerPrimary} 45deg,
      ${spinnerTeal} 180deg,
      ${spinnerPrimary} 315deg,
      ${spinnerPrimary} 360deg
    ) !important;
    -webkit-mask:
      linear-gradient(#000 0 0) padding-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask:
      linear-gradient(#000 0 0) padding-box,
      linear-gradient(#000 0 0);
    mask-composite: exclude;
  }
`
    : '';

  return `
@media (prefers-reduced-motion: no-preference) {
${tooltipCss}${tabsCss}${accordionCss}${calloutCss}${pageCss}${spinnerCss}}
`;
};

const getSelectedTab = (tabs: HTMLElement): HTMLElement | null => {
  const selectedTabs = tabs.querySelectorAll<HTMLElement>('.euiTab-isSelected');
  for (const tab of selectedTabs) {
    if (tab.closest('.euiTabs') === tabs) return tab;
  }
  return null;
};

const isDisabledTab = (tab: HTMLElement): boolean =>
  tab.hasAttribute('disabled') || tab.getAttribute('aria-disabled') === 'true';

const isIndicatorNode = (node: Node): boolean =>
  node instanceof Element && node.classList.contains(TAB_INDICATOR_CLASS);

const measureIndicator = (tabs: HTMLElement, tab: HTMLElement): { left: number; width: number } => {
  const tabsRect = tabs.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  return {
    left:
      Math.round((tabRect.left - tabsRect.left - tabs.clientLeft + tabs.scrollLeft) * 100) / 100,
    width: Math.round(tabRect.width * 100) / 100,
  };
};

const ensureIndicator = (tabs: HTMLElement): HTMLElement => {
  const existing = tabs.querySelector<HTMLElement>(`:scope > .${TAB_INDICATOR_CLASS}`);
  if (existing) return existing;

  const indicator = document.createElement('span');
  indicator.className = TAB_INDICATOR_CLASS;
  indicator.setAttribute('aria-hidden', 'true');
  tabs.appendChild(indicator);
  return indicator;
};

const placement = new WeakMap<HTMLElement, { left: number; width: number }>();

/** Moves one tab list's underline. `transform` keeps the slide on the compositor. */
const applyIndicator = (tabs: HTMLElement, tab: HTMLElement | null, animate: boolean) => {
  const indicator = ensureIndicator(tabs);
  if (!tab) {
    if (indicator.style.opacity !== '0') indicator.style.opacity = '0';
    return;
  }

  const { left, width } = measureIndicator(tabs, tab);
  const previous = placement.get(indicator);
  const disabled = isDisabledTab(tab);
  if (indicator.hasAttribute('data-disabled') !== disabled) {
    indicator.toggleAttribute('data-disabled', disabled);
  }
  const geometryUnchanged =
    previous !== undefined &&
    previous.left === left &&
    previous.width === width &&
    indicator.style.opacity === '1';
  if (geometryUnchanged) return;

  if (!animate) indicator.style.transition = 'none';
  indicator.style.opacity = '1';
  indicator.style.transform = `translate3d(${left}px, 0, 0) scaleX(${width})`;
  placement.set(indicator, { left, width });
  if (!animate) {
    indicator.getBoundingClientRect();
    indicator.style.removeProperty('transition');
  }
};

const collectTabLists = (node: Node, into: HTMLElement[]) => {
  if (!(node instanceof Element) || isIndicatorNode(node)) return;
  if (node.classList.contains('euiTabs')) into.push(node as HTMLElement);
  node.querySelectorAll<HTMLElement>('.euiTabs').forEach((tabs) => into.push(tabs));
};

type TabSyncMode = 'selection' | 'resize';

const startTabIndicator = (): (() => void) => {
  const selectedByTabs = new Map<HTMLElement, HTMLElement | null>();
  const pendingClick = new WeakMap<HTMLElement, HTMLElement>();
  const watched = new Set<HTMLElement>();
  const selectionObservers = new Map<HTMLElement, MutationObserver>();
  const sized = new WeakSet<Element>();
  const pending = new Map<HTMLElement, TabSyncMode>();
  let frame = 0;

  const observeSizes = (tabs: HTMLElement) => {
    if (!sized.has(tabs)) {
      sized.add(tabs);
      resizeObserver.observe(tabs);
    }
    tabs.querySelectorAll<HTMLElement>('.euiTab').forEach((tab) => {
      if (sized.has(tab)) return;
      sized.add(tab);
      resizeObserver.observe(tab);
    });
  };

  const unwatch = (tabs: HTMLElement) => {
    watched.delete(tabs);
    selectedByTabs.delete(tabs);
    pending.delete(tabs);
    pendingClick.delete(tabs);
    selectionObservers.get(tabs)?.disconnect();
    selectionObservers.delete(tabs);
    resizeObserver.unobserve(tabs);
    tabs.querySelectorAll<HTMLElement>('.euiTab').forEach((tab) => resizeObserver.unobserve(tab));
  };

  const sync = (tabs: HTMLElement, mode: TabSyncMode) => {
    if (!tabs.isConnected) {
      unwatch(tabs);
      return;
    }
    if (pendingClick.has(tabs)) return;

    const selected = getSelectedTab(tabs);
    const seen = selectedByTabs.has(tabs);
    const previous = selectedByTabs.get(tabs) ?? null;
    const selectionChanged = seen && previous !== selected;
    if (mode === 'selection' && !selectionChanged) {
      if (selected) {
        const indicator = tabs.querySelector<HTMLElement>(`:scope > .${TAB_INDICATOR_CLASS}`);
        const disabled = isDisabledTab(selected);
        if (indicator && indicator.hasAttribute('data-disabled') !== disabled) {
          indicator.toggleAttribute('data-disabled', disabled);
        }
      }
      return;
    }

    selectedByTabs.set(tabs, selected);
    applyIndicator(tabs, selected, selectionChanged && selected !== null);
  };

  const schedule = (tabs: HTMLElement, mode: TabSyncMode) => {
    const current = pending.get(tabs);
    pending.set(tabs, current === 'resize' || mode === 'resize' ? 'resize' : mode);
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const batch = [...pending];
      pending.clear();
      for (const [list, listMode] of batch) sync(list, listMode);
    });
  };

  const ensureWatch = (tabs: HTMLElement) => {
    if (watched.has(tabs)) return;
    watched.add(tabs);
    const observer = new MutationObserver((mutations) => {
      let relevant = false;
      let structureChanged = false;
      for (const mutation of mutations) {
        const target = mutation.target;
        if (!(target instanceof Element) || isIndicatorNode(target)) continue;
        if (mutation.type === 'childList') {
          const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
          if (nodes.length > 0 && nodes.every(isIndicatorNode)) continue;
          structureChanged = true;
        }
        relevant = true;
      }
      if (!relevant) return;
      if (structureChanged) observeSizes(tabs);
      schedule(tabs, 'selection');
    });
    observer.observe(tabs, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'aria-selected', 'disabled', 'aria-disabled'],
    });
    selectionObservers.set(tabs, observer);
    observeSizes(tabs);
  };

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const target = entry.target;
      if (!(target instanceof HTMLElement)) continue;
      const tabs = target.classList.contains('euiTabs') ? target : target.closest('.euiTabs');
      if (tabs instanceof HTMLElement && watched.has(tabs)) schedule(tabs, 'resize');
    }
  });

  const discoveryObserver = new MutationObserver((mutations) => {
    const found: HTMLElement[] = [];
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => collectTabLists(node, found));
      mutation.removedNodes.forEach((node) => {
        if (!(node instanceof Element) || isIndicatorNode(node)) return;
        if (node.classList.contains('euiTabs')) unwatch(node as HTMLElement);
        node.querySelectorAll<HTMLElement>('.euiTabs').forEach(unwatch);
      });
    }
    for (const tabs of found) {
      if (watched.has(tabs)) continue;
      ensureWatch(tabs);
      schedule(tabs, 'resize');
    }
  });

  const onClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const tab = target.closest('.euiTab');
    if (!(tab instanceof HTMLElement) || isDisabledTab(tab)) return;
    const tabs = tab.closest('.euiTabs');
    if (!(tabs instanceof HTMLElement)) return;
    if (selectedByTabs.get(tabs) === tab) return;

    ensureWatch(tabs);
    pendingClick.set(tabs, tab);
    selectedByTabs.set(tabs, tab);
    applyIndicator(tabs, tab, true);

    window.requestAnimationFrame(() => {
      if (pendingClick.get(tabs) !== tab) return;
      pendingClick.delete(tabs);
      if (getSelectedTab(tabs) === tab) return;
      const selected = getSelectedTab(tabs);
      selectedByTabs.set(tabs, selected);
      applyIndicator(tabs, selected, false);
    });
  };

  discoveryObserver.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', onClick, true);
  document.querySelectorAll<HTMLElement>('.euiTabs').forEach((tabs) => {
    ensureWatch(tabs);
    sync(tabs, 'resize');
  });

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    discoveryObserver.disconnect();
    selectionObservers.forEach((observer) => observer.disconnect());
    resizeObserver.disconnect();
    document.removeEventListener('click', onClick, true);
    document.querySelectorAll(`.${TAB_INDICATOR_CLASS}`).forEach((node) => node.remove());
    watched.clear();
    selectedByTabs.clear();
    pending.clear();
  };
};

const CALLOUT_SELECTOR = '.euiCallOut, .euiBanner';
const CALLOUT_MOTION_ATTR = 'data-kbn-callout-motion';

interface CalloutBox {
  height: number;
  paddingTop: string;
  paddingBottom: string;
  marginTop: string;
  marginBottom: string;
  borderTopWidth: string;
  borderBottomWidth: string;
}

const readCalloutBox = (node: HTMLElement): CalloutBox => {
  const style = window.getComputedStyle(node);
  return {
    height: node.getBoundingClientRect().height,
    paddingTop: style.paddingTop,
    paddingBottom: style.paddingBottom,
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
    borderTopWidth: style.borderTopWidth,
    borderBottomWidth: style.borderBottomWidth,
  };
};

const collapseCallout = (node: HTMLElement) => {
  node.style.height = '0px';
  node.style.opacity = '0';
  node.style.paddingTop = '0px';
  node.style.paddingBottom = '0px';
  node.style.marginTop = '0px';
  node.style.marginBottom = '0px';
  node.style.borderTopWidth = '0px';
  node.style.borderBottomWidth = '0px';
};

const expandCallout = (node: HTMLElement, box: CalloutBox) => {
  node.style.height = `${box.height}px`;
  node.style.opacity = '1';
  node.style.paddingTop = box.paddingTop;
  node.style.paddingBottom = box.paddingBottom;
  node.style.marginTop = box.marginTop;
  node.style.marginBottom = box.marginBottom;
  node.style.borderTopWidth = box.borderTopWidth;
  node.style.borderBottomWidth = box.borderBottomWidth;
};

const clearCalloutMotionStyles = (node: HTMLElement) => {
  node.style.height = '';
  node.style.opacity = '';
  node.style.paddingTop = '';
  node.style.paddingBottom = '';
  node.style.marginTop = '';
  node.style.marginBottom = '';
  node.style.borderTopWidth = '';
  node.style.borderBottomWidth = '';
  node.style.transition = '';
};

const durationMs = (value: string): number => {
  const amount = parseFloat(value);
  if (Number.isNaN(amount)) return 250;
  return value.trim().endsWith('ms') ? amount : amount * 1000;
};

const calloutsIn = (node: HTMLElement): HTMLElement[] => {
  if (node.getAttribute(CALLOUT_MOTION_ATTR) === 'exit') return [];
  if (node.matches(CALLOUT_SELECTOR)) return [node];
  if (node.childElementCount > 8) return [];
  const found = [...node.querySelectorAll<HTMLElement>(CALLOUT_SELECTOR)];
  if (found.length === 0 || found.length > 3) return [];
  return found;
};

/**
 * Callouts and banners appear with the rest of the page. Dismissing one plays the
 * study's height-and-fade on a stand-in, because React has already unmounted it.
 */
const startCalloutMotion = (tokens: MotionTokens): (() => void) => {
  const boxes = new WeakMap<HTMLElement, CalloutBox>();
  const timers = new Set<number>();
  const exitTimeout = durationMs(tokens.calloutDuration) + 80;

  const remember = (node: HTMLElement) => {
    if (node.getAttribute(CALLOUT_MOTION_ATTR)) return;
    if (node.closest(`[${CALLOUT_MOTION_ATTR}="exit"]`)) return;
    node.setAttribute(CALLOUT_MOTION_ATTR, 'shown');
    boxes.set(node, readCalloutBox(node));
    resizeObserver.observe(node);
  };

  const playExit = (node: HTMLElement, box: CalloutBox) => {
    node.style.transition = 'none';
    expandCallout(node, box);
    node.getBoundingClientRect();
    window.requestAnimationFrame(() => {
      if (!node.isConnected) return;
      node.style.transition = '';
      node.getBoundingClientRect();
      collapseCallout(node);
    });
  };

  const exit = (node: HTMLElement, parent: Node, next: Node | null) => {
    if (!(parent instanceof HTMLElement) || !parent.isConnected) return;
    const box = boxes.get(node) ?? readCalloutBox(node);
    if (box.height < 1) return;

    const standIn = node.cloneNode(true) as HTMLElement;
    clearCalloutMotionStyles(standIn);
    standIn.setAttribute(CALLOUT_MOTION_ATTR, 'exit');
    standIn.setAttribute('aria-hidden', 'true');
    standIn.inert = true;
    parent.insertBefore(standIn, next);
    playExit(standIn, box);
    const remove = () => {
      standIn.remove();
    };
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      remove();
    }, exitTimeout);
    timers.add(timer);
    standIn.addEventListener('transitionend', (event) => {
      if (event.target === standIn && event.propertyName === 'height') remove();
    });
  };

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const node = entry.target;
      if (!(node instanceof HTMLElement)) continue;
      if (node.getAttribute(CALLOUT_MOTION_ATTR) !== 'shown') continue;
      boxes.set(node, readCalloutBox(node));
    }
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((added) => {
        if (!(added instanceof HTMLElement)) return;
        calloutsIn(added).forEach(remember);
      });
      if (!mutation.target.isConnected) continue;
      mutation.removedNodes.forEach((removed) => {
        if (!(removed instanceof HTMLElement) || removed.isConnected) return;
        const leaving = calloutsIn(removed);
        for (let index = leaving.length - 1; index >= 0; index -= 1) {
          exit(leaving[index], mutation.target, mutation.nextSibling);
        }
      });
    }
  });

  document.querySelectorAll<HTMLElement>(CALLOUT_SELECTOR).forEach(remember);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    resizeObserver.disconnect();
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    document.querySelectorAll<HTMLElement>(`[${CALLOUT_MOTION_ATTR}="exit"]`).forEach((node) => {
      node.remove();
    });
  };
};

const APP_PAGE_SELECTOR = '.kbnAppWrapper[aria-busy]';
const PAGE_ENTER_ATTR = 'data-kbn-page-enter';

const pageWrappersIn = (node: HTMLElement): HTMLElement[] => {
  const found: HTMLElement[] = [];
  if (node.matches(APP_PAGE_SELECTOR)) found.push(node);
  node.querySelectorAll<HTMLElement>(APP_PAGE_SELECTOR).forEach((wrapper) => found.push(wrapper));
  return found;
};

/**
 * Fades the app in and lifts its content blocks once the next app has mounted.
 * The header and navigation sit outside this wrapper, and in-app routes reuse it.
 */
const startPageMotion = (): (() => void) => {
  const exitTimeout = durationMs(PAGE_ENTER_DURATION) + 80;
  const played = new WeakSet<HTMLElement>();
  const attributeObservers = new Map<HTMLElement, MutationObserver>();
  const cleanups = new Map<HTMLElement, () => void>();

  const release = (wrapper: HTMLElement) => {
    attributeObservers.get(wrapper)?.disconnect();
    attributeObservers.delete(wrapper);
    cleanups.get(wrapper)?.();
    cleanups.delete(wrapper);
  };

  const playEnter = (wrapper: HTMLElement) => {
    if (played.has(wrapper)) return;
    played.add(wrapper);
    attributeObservers.get(wrapper)?.disconnect();
    attributeObservers.delete(wrapper);
    wrapper.setAttribute(PAGE_ENTER_ATTR, 'hold');

    let timeout = 0;
    let frame = 0;
    const onEnd = (event: AnimationEvent) => {
      if (event.target !== wrapper || event.animationName !== 'kbnPageEnter') return;
      release(wrapper);
    };
    // Wait until the new page has painted. A heavy app blocks the main thread
    // long enough to consume a short fade before the first frame.
    const start = () => {
      if (!wrapper.isConnected) return;
      wrapper.setAttribute(PAGE_ENTER_ATTR, 'enter');
      wrapper.addEventListener('animationend', onEnd);
      timeout = window.setTimeout(() => release(wrapper), exitTimeout);
    };
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(start);
    });
    cleanups.set(wrapper, () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      wrapper.removeEventListener('animationend', onEnd);
      wrapper.removeAttribute(PAGE_ENTER_ATTR);
    });
  };

  const arm = (wrapper: HTMLElement) => {
    if (played.has(wrapper) || attributeObservers.has(wrapper)) return;
    if (wrapper.getAttribute('aria-busy') === 'false') {
      playEnter(wrapper);
      return;
    }

    wrapper.setAttribute(PAGE_ENTER_ATTR, 'hold');
    const observer = new MutationObserver(() => {
      if (wrapper.getAttribute('aria-busy') === 'false') playEnter(wrapper);
    });
    attributeObservers.set(wrapper, observer);
    observer.observe(wrapper, { attributes: true, attributeFilter: ['aria-busy'] });
    if (wrapper.getAttribute('aria-busy') === 'false') playEnter(wrapper);
  };

  document.querySelectorAll<HTMLElement>(APP_PAGE_SELECTOR).forEach((wrapper) => {
    if (wrapper.getAttribute('aria-busy') === 'false') {
      played.add(wrapper);
      return;
    }
    arm(wrapper);
  });

  const discovery = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((added) => {
        if (!(added instanceof HTMLElement)) return;
        pageWrappersIn(added).forEach(arm);
      });
      mutation.removedNodes.forEach((removed) => {
        if (!(removed instanceof HTMLElement)) return;
        pageWrappersIn(removed).forEach(release);
      });
    }
  });
  discovery.observe(document.body, { childList: true, subtree: true });

  return () => {
    discovery.disconnect();
    attributeObservers.forEach((observer) => observer.disconnect());
    attributeObservers.clear();
    cleanups.forEach((cleanup) => cleanup());
    cleanups.clear();
    document.querySelectorAll<HTMLElement>(`[${PAGE_ENTER_ATTR}]`).forEach((node) => {
      node.removeAttribute(PAGE_ENTER_ATTR);
    });
  };
};

const LOGIN_PATTERN_ID = 'kbn-login-pattern';

const isLoginScreenPath = (): boolean => /\/login\/?$/.test(window.location.pathname);

const loginAssetBase = (): string => {
  const link = document.querySelector('link[rel="stylesheet"][href*="legacy_styles.css"]');
  const href = link?.getAttribute('href') ?? '';
  return href.replace(/legacy_styles\.css(?:\?.*)?$/, '');
};

const readSplashBackground = (): string => {
  const htmlBackground = getComputedStyle(document.documentElement).backgroundColor;
  if (htmlBackground && htmlBackground !== 'transparent' && htmlBackground !== 'rgba(0, 0, 0, 0)') {
    return htmlBackground;
  }
  return '#ECF1F9';
};

const createLoginPattern = (): HTMLDivElement => {
  const pattern = document.createElement('div');
  pattern.id = LOGIN_PATTERN_ID;
  pattern.className = 'kbnLoginPattern';
  pattern.setAttribute('aria-hidden', 'true');
  pattern.style.backgroundColor = readSplashBackground();

  const base = loginAssetBase();
  const addBlob = (className: string, file: string, width: string, height: string) => {
    const image = document.createElement('img');
    image.className = className;
    image.alt = '';
    image.setAttribute('width', width);
    image.setAttribute('height', height);
    image.src = `${base}login_screen/${file}`;
    pattern.append(image);
  };
  addBlob('kbnLoginBlobStart', 'blob_start.svg', '1218', '1219.55');
  addBlob('kbnLoginBlobEnd', 'blob_end.svg', '1270', '1219');
  return pattern;
};

/** Puts the boot-screen corner pattern behind /login and /mock_idp/login. */
const startLoginPattern = (): (() => void) => {
  let frame = 0;

  const sync = () => {
    const enabled = isLoginScreenPath();
    const root = document.documentElement;
    const current = document.getElementById(LOGIN_PATTERN_ID);
    if (enabled && current && root.hasAttribute('data-kbn-login-pattern')) return;
    if (!enabled && !current && !root.hasAttribute('data-kbn-login-pattern')) return;

    root.toggleAttribute('data-kbn-login-pattern', enabled);
    if (!enabled) {
      current?.remove();
      return;
    }
    if (!current) {
      const anchor = document.getElementById('kibana-body');
      const pattern = createLoginPattern();
      if (anchor) document.body.insertBefore(pattern, anchor);
      else document.body.prepend(pattern);
    }
  };

  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      sync();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', schedule);
  sync();

  return () => {
    observer.disconnect();
    window.removeEventListener('popstate', schedule);
    if (frame) window.cancelAnimationFrame(frame);
    document.getElementById(LOGIN_PATTERN_ID)?.remove();
    document.documentElement.removeAttribute('data-kbn-login-pattern');
  };
};
