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

/**
 * Prototype motions mounted once for the whole Kibana UI.
 * Tooltips reuse the popover reveal. Tab bars slide one indicator between selections.
 * Accordions rotate a custom arrow glyph and slide their content open.
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

const applyMotionPrototype = () => {
  if (!styleElement || !motionTokens) return;

  const settings = getMotionRefreshSettings();
  styleElement.textContent = buildMotionCss(motionTokens, settings);

  const tabsOn = settings.tabs && !window.matchMedia(REDUCED_MOTION_QUERY).matches;
  if (tabsOn && !stopTabs) {
    stopTabs = startTabIndicator();
  } else if (!tabsOn && stopTabs) {
    stopTabs();
    stopTabs = undefined;
  }
};

const startMotionPrototype = (tokens: MotionTokens): (() => void) => {
  motionTokens = tokens;
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  styleElement = style;
  document.head.appendChild(style);
  document.documentElement.setAttribute('data-kbn-motion-prototype', 'tooltip-tabs-accordion');
  applyMotionPrototype();
  const unsubscribe = subscribeMotionRefreshSettings(applyMotionPrototype);

  return () => {
    unsubscribe();
    stopTabs?.();
    stopTabs = undefined;
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
    bottom: 0;
    height: ${indicatorThickness};
    background: ${indicatorColor};
    pointer-events: none;
    z-index: 1;
    transition: left ${tabDuration} ${tabEasing}, width ${tabDuration} ${tabEasing};
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

  return `
@media (prefers-reduced-motion: no-preference) {
${tooltipCss}${tabsCss}${accordionCss}}
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

const applyIndicator = (tabs: HTMLElement, indicator: HTMLElement, animate: boolean) => {
  const selected = getSelectedTab(tabs);
  if (!selected) {
    if (indicator.style.opacity !== '0') indicator.style.opacity = '0';
    return;
  }

  const { left, width } = measureIndicator(tabs, selected);
  const nextLeft = `${left}px`;
  const nextWidth = `${width}px`;
  const disabled = isDisabledTab(selected);
  if (indicator.hasAttribute('data-disabled') !== disabled) {
    indicator.toggleAttribute('data-disabled', disabled);
  }

  const geometryUnchanged =
    indicator.style.left === nextLeft &&
    indicator.style.width === nextWidth &&
    indicator.style.opacity === '1';
  if (!animate && geometryUnchanged) return;

  if (!animate) indicator.style.transition = 'none';
  indicator.style.opacity = '1';
  indicator.style.left = nextLeft;
  indicator.style.width = nextWidth;
  if (!animate) {
    indicator.getBoundingClientRect();
    indicator.style.removeProperty('transition');
  }
};

const isIndicatorNode = (node: Node): boolean =>
  node instanceof Element && node.classList.contains(TAB_INDICATOR_CLASS);

const mutationTouchesTabs = (mutation: MutationRecord): boolean => {
  if (mutation.type === 'attributes') {
    const target = mutation.target;
    return target instanceof Element && !!target.closest('.euiTabs') && !isIndicatorNode(target);
  }

  if (mutation.target instanceof Element && mutation.target.closest('.euiTabs')) {
    const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
    if (nodes.length > 0 && nodes.every(isIndicatorNode)) return false;
    return true;
  }

  const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
  return nodes.some((node) => {
    if (!(node instanceof Element) || isIndicatorNode(node)) return false;
    return node.classList.contains('euiTabs') || !!node.querySelector('.euiTabs');
  });
};

const startTabIndicator = (): (() => void) => {
  const selectedByTabs = new Map<HTMLElement, HTMLElement | null>();
  const observed = new Set<Element>();
  let frame = 0;

  const syncAll = () => {
    const liveTabs = [...document.querySelectorAll<HTMLElement>('.euiTabs')];
    const live = new Set(liveTabs);

    for (const tabs of liveTabs) {
      watch(tabs);
      tabs.querySelectorAll<HTMLElement>('.euiTab').forEach(watch);

      const indicator = ensureIndicator(tabs);
      const selected = getSelectedTab(tabs);
      const seen = selectedByTabs.has(tabs);
      const previous = selectedByTabs.get(tabs) ?? null;
      selectedByTabs.set(tabs, selected);
      const animate = seen && previous !== selected && selected !== null;
      applyIndicator(tabs, indicator, animate);
    }

    for (const tabs of selectedByTabs.keys()) {
      if (!live.has(tabs)) selectedByTabs.delete(tabs);
    }
  };

  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      syncAll();
    });
  };

  const resizeObserver = new ResizeObserver(() => schedule());
  const watch = (element: Element) => {
    if (observed.has(element)) return;
    observed.add(element);
    resizeObserver.observe(element);
  };

  const observer = new MutationObserver((mutations) => {
    if (mutations.some(mutationTouchesTabs)) schedule();
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'aria-selected', 'disabled', 'aria-disabled'],
  });

  const onScroll = (event: Event) => {
    const target = event.target;
    if (target instanceof Element && target.classList.contains('euiTabs')) schedule();
  };
  document.addEventListener('scroll', onScroll, true);

  syncAll();

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    observer.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener('scroll', onScroll, true);
    document.querySelectorAll(`.${TAB_INDICATOR_CLASS}`).forEach((node) => node.remove());
    selectedByTabs.clear();
  };
};
