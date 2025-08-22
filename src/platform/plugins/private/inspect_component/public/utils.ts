/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize } from '@elastic/eui';
import type {
  FileData,
  GetElementFromPointOptions,
  GetInspectedElementOptions,
  ReactFiberNode,
  SetElementHighlightOptions,
} from './types';
import { getComponentData } from './get_component_data';
import { EUI_DATA_ICON_TYPE } from './constants';

const EUI_DOCS_BASE = 'https://eui.elastic.co/docs';

const EUI_COMPONENT_SLUG_OVERRIDES: Record<string, string> = {
  EuiAccordion: '/components/containers/accordion',
  EuiAspectRatio: '/components/display/aspect-ratio',
  EuiAutoRefresh: '/components/forms/date-and-time/auto-refresh',
  EuiAutoRefreshButton: '/components/forms/date-and-time/auto-refresh/#auto-refresh-button',
  EuiAvatar: '/components/display/avatar',
  EuiBadge: '/components/display/badge',
  EuiBadgeGroup: '/components/display/badge/#badge-groups-and-truncation',
  EuiBasicTable: '/components/tables/basic',
  EuiBeacon: '/components/display/beacon',
  EuiBetaBadge: '/components/display/badge/#beta-badge',
  EuiBottomBar: '/components/containers/bottom-bar',
  EuiButton: '/components/navigation/buttons/button',
  EuiButtonEmpty: '/components/navigation/buttons/button/#empty',
  EuiButtonGroup: '/components/navigation/buttons/group',
  EuiButtonIcon: '/components/navigation/buttons/button/#icon',
  EuiCallOut: '/components/display/callout',
  EuiCard: '/components/containers/card/',
  EuiCheckableCard: '/components/containers/card/#checkable',
  EuiCheckbox: '/components/forms/selection/checkboxes-and-radios/#checkbox',
  EuiCheckboxGroup: '/components/forms/selection/checkboxes-and-radios/#checkbox-group',
  EuiCode: '/components/display/code',
  EuiCodeBlock: '/components/display/code/#code-block',
  EuiCollapsibleNav: '/components/navigation/collapsible-nav',
  EuiCollapsibleNavGroup:
    '/components/navigation/collapsible-nav/#nav-groups-with-lists-and-other-content',
  EuiColorPalettePicker: '/components/forms/other/palette-picker',
  EuiColorPicker: '/components/forms/other/color-picker',
  EuiComboBox: '/components/forms/selection/combo-box/',
  EuiComment: '/components/display/comment-list/#comment',
  EuiCommentEvent: '/components/display/comment-list/#EuiCommentEvent',
  EuiCommentList: '/components/display/comment-list',
  EuiConfirmModal: '/containers/modal/#confirm-modal',
  EuiContextMenu: '/components/navigation/context-menu',
  EuiContextMenuItem: '/components/navigation/context-menu/#EuiContextMenuItem',
  EuiContextMenuPanel: '/components/navigation/context-menu/#with-single-panel',
  EuiDataGrid: '/components/data-grid',
  EuiDataGridCellPopoverElementProps:
    '/components/data-grid/cells-and-popovers/#EuiDataGridCellPopoverElementProps',
  EuiDataGridCellValueElementProps:
    '/components/data-grid/cells-and-popovers/#EuiDataGridCellValueElementProps',
  EuiDataGridColumn: '/components/data-grid/schema-and-columns/#columns',
  EuiDataGridColumnActions: '/components/data-grid/schema-and-columns/#EuiDataGridColumnActions',
  EuiDataGridColumnCellActionProps:
    '/components/data-grid/schema-and-columns/#EuiDataGridColumnCellActionProps',
  EuiDataGridColumnVisibility:
    '/components/data-grid/schema-and-columns/#EuiDataGridColumnVisibility',
  EuiDataGridControlColumn: '/components/data-grid/schema-and-columns/#control-columns',
  EuiDataGridCustomBodyProps:
    '/components/data-grid/advanced/custom-body-rendering/#EuiDataGridCustomBodyProps',
  EuiDataGridCustomToolbarProps: '/components/data-grid/toolbar/#EuiDataGridCustomToolbarProps',
  EuiDataGridDisplaySelectorCustomRenderProps:
    '/components/data-grid/toolbar/#EuiDataGridDisplaySelectorCustomRenderProps',
  EuiDataGridInMemory: '/components/data-grid/advanced/in-memory/#EuiDataGridInMemory',
  EuiDataGridPaginationProps:
    '/components/data-grid/advanced/in-memory/#EuiDataGridPaginationProps',
  EuiDataGridProps: '/components/data-grid/container-constraints/#EuiDataGridProps',
  EuiDataGridRefProps: '/components/data-grid/advanced/ref/#EuiDataGridRefProps',
  EuiDataGridRowHeightsOptions:
    '/components/data-grid/style-and-display/#EuiDataGridRowHeightsOptions',
  EuiDataGridSchemaDetector: '/components/data-grid/schema-and-columns/#defining-custom-schemas',
  EuiDataGridSorting: '/components/data-grid/advanced/in-memory/#EuiDataGridSorting',
  EuiDataGridStyle: '/components/data-grid/style-and-display/#EuiDataGridStyle',
  EuiDataGridToolBarAdditionalControlsLeftOptions:
    '/components/data-grid/toolbar/#EuiDataGridToolBarAdditionalControlsLeftOptions',
  EuiDataGridToolBarAdditionalControlsOptions:
    '/components/data-grid/toolbar/#EuiDataGridToolBarAdditionalControlsOptions',
  EuiDataGridToolbarControl: '/components/data-grid/toolbar/#EuiDataGridToolbarControl',
  EuiDataGridToolBarVisibilityColumnSelectorOptions:
    '/components/data-grid/toolbar/#EuiDataGridToolBarVisibilityColumnSelectorOptions',
  EuiDataGridToolBarVisibilityDisplaySelectorOptions:
    '/components/data-grid/toolbar/#EuiDataGridToolBarVisibilityDisplaySelectorOptions',
  EuiDataGridToolBarVisibilityOptions:
    '/components/data-grid/toolbar/#EuiDataGridToolBarVisibilityOptions',
  EuiDataGridVirtualizationOptions:
    '/components/data-grid/container-constraints/#EuiDataGridVirtualizationOptions',
  EuiDatePicker: '/components/forms/date-and-time/date-picker',
  EuiDatePickerRange: '/components/forms/date-and-time/date-picker-range',
  EuiDescribedFormGroup: '/components/forms/layouts/described-groups',
  EuiDescriptionList: '/components/display/description-list',
  EuiDescriptionListDescription:
    '/components/display/description-list/#EuiDescriptionListDescription',
  EuiDescriptionListTitle: '/components/display/description-list/#EuiDescriptionListTitle',
  EuiDragDropContext: '/components/display/drag-and-drop/#EuiDragDropContext',
  EuiDraggable: '/components/display/drag-and-drop/#EuiDraggable',
  EuiDroppable: '/components/display/drag-and-drop/#EuiDroppable',
  EuiDualRange: '/components/forms/numeric/range-sliders/#dual-range',
  EuiEmptyPrompt: '/components/display/empty-prompt',
  EuiExpression: '/components/forms/search-and-filter/expression',
  EuiFacetButton: '/components/navigation/facet',
  EuiFacetGroup: '/components/navigation/facet/#facet-layout',
  EuiFieldNumber: '/components/forms/numeric',
  EuiFieldPassword: '/components/forms/text/password',
  EuiFieldSearch: '/components/forms/search-and-filter/search',
  EuiFieldText: '/components/forms/text/#text-field',
  EuiFilePicker: '/components/forms/other/file-picker',
  EuiFilterButton: '/components/navigation/buttons/filter-group/#filter-buttons',
  EuiFilterGroup: '/components/navigation/buttons/filter-group',
  EuiFlexGrid: '/components/layout/flex/grid',
  EuiFlexGroup: '/components/layout/flex/group',
  EuiFlexItem: '/components/layout/flex/item',
  EuiFlyout: '/components/containers/flyout',
  EuiFlyoutBody: '/components/containers/flyout/#EuiFlyoutBody',
  EuiFlyoutChild: '/components/containers/flyout/#child-flyout-beta',
  EuiFlyoutFooter: '/components/containers/flyout/#EuiFlyoutFooter',
  EuiFlyoutHeader: '/components/containers/flyout/#EuiFlyoutHeader',
  EuiFlyoutResizable: '/components/containers/flyout/#resizable-flyout',
  EuiForm: '/components/forms/controls/guidelines',
  EuiFormControlLayout: '/components/forms/layouts/controls/#EuiFormControlLayout',
  EuiFormControlLayoutDelimited: '/components/forms/layouts/controls/#delimited-layout',
  EuiFormFieldset: '/components/forms/layouts/label/#fieldset-and-legend',
  EuiFormLabel: '/components/forms/layouts/label/#EuiFormLabel',
  EuiFormRow: '/components/forms/layouts/row',
  EuiGlobalToastList: '/components/display/toast/#EuiGlobalToastList',
  EuiGlobalToastListItem: '/components/display/toast/#EuiGlobalToastListItem',
  EuiHeader: '/components/layout/header',
  EuiHeaderBreadcrumbs: '/components/layout/header/#EuiHeaderBreadcrumbs',
  EuiHeaderLinks: '/components/layout/header/#header-links',
  EuiHeaderLogo: '/components/layout/header/#EuiHeaderLogo',
  EuiHeaderSection: '/components/layout/header/#sections',
  EuiHeaderSectionItem: '/components/layout/header/#EuiHeaderSectionItem',
  EuiHeaderSectionItemButton: '/components/layout/header/#portal-content-in-the-header',
  EuiHealth: '/components/display/health',
  EuiHighlight: '/utilities/highlight-and-mark/#highlight',
  EuiHorizontalRule: '/components/layout/horizontal-rule',
  EuiIcon: '/components/display/icons',
  EuiIconTip: '/components/display/tooltip/#icontip',
  EuiImage: '/components/display/image',
  EuiInlineEdit: '/components/forms/text/inline-edit/',
  EuiInlineEditText: '/components/forms/text/inline-edit/#display-and-edit-basic-text',
  EuiInlineEditTitle: '/components/forms/text/inline-edit/#display-and-edit-headings-and-titles',
  EuiInMemoryTable: '/components/tables/in-memory',
  EuiInputPopover: '/components/containers/popover/#popover-attached-to-input-element',
  EuiKeyPadMenu: '/components/navigation/buttons/key-pad-menu',
  EuiKeyPadMenuItem: '/components/navigation/buttons/key-pad-menu/#menu-item',
  EuiLink: '/components/navigation/link',
  EuiListGroup: '/components/display/list-group',
  EuiListGroupItem: '/components/display/list-group/#EuiListGroupItem',
  EuiLoadingChart: '/components/display/loading/#chart',
  EuiLoadingElastic: '/components/display/loading/#elastic',
  EuiLoadingLogo: '/components/display/loading/#logos',
  EuiLoadingSpinner: '/components/display/loading/#spinner',
  EuiMarkdownEditor: '/components/editors-and-syntax/markdown/editor',
  EuiMarkdownFormat: '/components/editors-and-syntax/markdown/format',
  EuiModal: '/containers/modal',
  EuiModalBody: '/containers/modal/#EuiModalBody',
  EuiModalFooter: '/containers/modal/#EuiModalFooter',
  EuiModalHeader: '/containers/modal/#EuiModalHeader',
  EuiModalHeaderTitle: '/containers/modal/#EuiModalHeaderTitle',
  EuiNotificationBadge: '/components/display/badge/#beta-badge',
  EuiPage: '/layout/page-components/#page-body-and-sidebar',
  EuiPageBody: '/layout/page-components/#page-sections',
  EuiPageHeader: '/components/layout/page-header',
  EuiPageHeaderContent: '/components/layout/page-header/#EuiPageHeaderContent',
  EuiPageHeaderSection: '/components/layout/page-header/#EuiPageHeaderSection',
  EuiPageSection: '/layout/page-components/#page-sections',
  EuiPageSidebar: '/layout/page-components/#page-body-and-sidebar',
  EuiPageTemplate: '/components/templates/page-template',
  EuiPagination: '/components/navigation/pagination',
  EuiPaginationButton: '/components/navigation/pagination/#EuiPaginationButton',
  EuiPanel: '/components/containers/panel',
  EuiPinnableListGroup: '/components/display/list-group/#pinnable-list-group',
  EuiPopover: '/components/containers/popover',
  EuiPopoverFooter: '/components/containers/popover/#EuiPopoverFooter',
  EuiPopoverTitle: '/components/containers/popover/#EuiPopoverTitle',
  EuiProgress: '/components/display/progress',
  EuiRadio: '/components/forms/selection/checkboxes-and-radios/#radio',
  EuiRadioGroup: '/components/forms/selection/checkboxes-and-radios/#radio-group',
  EuiRange: '/components/forms/numeric/range-sliders',
  EuiRefreshInterval: '/components/forms/date-and-time/auto-refresh/#refresh-interval',
  EuiResizableButton: '/components/containers/resizable-container/#resizable-button-indicator',
  EuiResizableContainer: '/components/containers/resizable-container',
  EuiSearchBar: '/components/forms/search-and-filter/search-bar',
  EuiSearchBarFilters: '/components/forms/search-and-filter/search-bar/#EuiSearchBarFilters',
  EuiSelect: '/components/forms/selection/select',
  EuiSelectable: '/components/forms/selection/selectable',
  EuiSelectableMessage: '/components/forms/selection/selectable/#messages-and-loading',
  EuiSelectableTemplateSitewide: '/components/templates/sitewide-search',
  EuiSideNav: '/components/navigation/side-nav',
  EuiSkeletonCircle: '/components/display/skeleton/#circle',
  EuiSkeletonLoading: '/components/display/skeleton/#combining-multiple-skeletons',
  EuiSkeletonRectangle: '/components/display/skeleton/#rectangle',
  EuiSkeletonText: '/components/display/skeleton/#text',
  EuiSkeletonTitle: '/components/display/skeleton/#title',
  EuiSpacer: '/components/layout/spacer',
  EuiSplitPanel: '/components/containers/panel/#split',
  EuiStat: '/components/display/stat',
  EuiStep: '/components/navigation/steps/#EuiStep',
  EuiStepHorizontal: '/components/navigation/steps/#EuiStepHorizontal',
  EuiStepNumber: '/components/navigation/steps/#EuiStepNumber',
  EuiSteps: '/components/navigation/steps',
  EuiStepsHorizontal: '/components/navigation/steps/#horizontal-steps',
  EuiSubSteps: '/components/navigation/steps/#EuiSubSteps',
  EuiSuperDatePicker: '/components/forms/date-and-time/super-date-picker',
  EuiSuperSelect: '/components/forms/selection/super-select',
  EuiSwitch: '/forms/selection/checkboxes-and-radios/switch',
  EuiTab: '/components/containers/tabs/#EuiTab',
  EuiTabbedContent: '/components/containers/tabs/#tabbed-content',
  EuiTable: '/components/tables/custom/#EuiTable',
  EuiTableBody: '/components/tables/custom/#EuiTableBody',
  EuiTableFooter: '/components/tables/custom/#EuiTableFooter',
  EuiTableFooterCell: '/components/tables/custom/#EuiTableFooterCell',
  EuiTableHeader: '/components/tables/custom/#EuiTableHeader',
  EuiTableHeaderCell: '/components/tables/custom/#EuiTableHeaderCell',
  EuiTableHeaderCellCheckbox: '/components/tables/custom/#EuiTableHeaderCellCheckbox',
  EuiTableHeaderMobile: '/components/tables/custom/#EuiTableHeaderMobile',
  EuiTablePagination: '/components/navigation/pagination/#table-pagination',
  EuiTableRow: '/components/tables/custom/#EuiTableRow',
  EuiTableRowCell: '/components/tables/custom/#EuiTableRowCell',
  EuiTableRowCellCheckbox: '/components/tables/custom/#EuiTableRowCellCheckbox',
  EuiTableSortMobile: '/components/tables/custom/#EuiTableSortMobile',
  EuiTableSortMobileItem: '/components/tables/custom/#EuiTableSortMobileItem',
  EuiTabs: '/components/containers/tabs',
  EuiText: '/components/display/text',
  EuiTextAlign: '/components/display/text/#alignment',
  EuiTextArea: '/components/forms/text/#textarea',
  EuiTextColor: '/components/display/text#coloring-text',
  EuiTimeline: '/components/display/timeline',
  EuiTimelineItem: '/components/display/timeline/#timeline-item',
  EuiTimelineItemEvent: '/components/display/timeline/#EuiTimelineItemEvent',
  EuiTimelineItemIcon: '/components/display/timeline/#EuiTimelineItemIcon',
  EuiTitle: '/components/display/title',
  EuiToast: '/components/display/toast',
  EuiToolTip: '/components/display/tooltip',
  EuiTour: '/components/display/tour',
  EuiTourStep: '/components/display/tour/#wrap-target-element',
  EuiTourStepIndicator: '/components/display/tour/#EuiTourStepIndicator',
  EuiTreeView: '/components/navigation/tree-view',
  EuiTreeViewItem: '/components/navigation/tree-view/#EuiTreeViewItem',
  EuiWrappingPopover: '/components/containers/popover/#popover-using-an-htmlelement-as-the-anchor',
};

const camelToKebab = (str: string) =>
  str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();

export const getEuiComponentDocLink = (componentName?: string): string | undefined => {
  if (!componentName || !componentName.startsWith('Eui')) return;

  const override = EUI_COMPONENT_SLUG_OVERRIDES[componentName];
  if (override) {
    return override.startsWith('http') ? override : `${EUI_DOCS_BASE}${override}`;
  }

  const core = componentName.slice(3);
  if (!core) return;

  const slug = camelToKebab(core);

  return `${EUI_DOCS_BASE}/${slug}`;
};

export const getEuiComponentDocLinkAtNode = (
  node: HTMLElement | SVGElement
): string | undefined => {
  const name = getEuiComponentNameAtNode(node);
  return getEuiComponentDocLink(name);
};

const isSingleQuote = (event: KeyboardEvent) => event.code === 'Quote' || event.key === "'";

const getFiberFromDomNode = (node: HTMLElement | SVGElement): ReactFiberNode | undefined => {
  const fiberKey = Object.keys(node).find((key) => key.startsWith('__reactFiber$'));
  return fiberKey ? (node as any)[fiberKey] : undefined;
};

const getEuiComponentNameFromFiberChain = (fiber: ReactFiberNode): string | undefined => {
  let cursor: ReactFiberNode | null | undefined = fiber;

  while (cursor) {
    const type = cursor.type || cursor.elementType;

    const name = (type as any)?.displayName || (type as any)?.name;

    if (typeof name === 'string' && name.startsWith('Eui')) return name;

    const fileName = cursor._debugSource?.fileName;
    if (fileName && fileName.includes('/@elastic/eui/')) {
      if (typeof name === 'string' && name) return name;

      const segment = fileName.split(/[\\/]/).pop() || '';
      const base = segment.replace(/\.(t|j)sx?$/, '');
      return base || undefined;
    }
    cursor = cursor._debugOwner;
  }

  return undefined;
};

export const isEuiComponentAtNode = (node: HTMLElement | SVGElement): boolean =>
  !!getEuiComponentNameAtNode(node);

export const getEuiComponentNameAtNode = (node: HTMLElement | SVGElement): string | undefined => {
  let current: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;

  while (current) {
    const fiber = getFiberFromDomNode(current);

    if (fiber) {
      const name = getEuiComponentNameFromFiberChain(fiber);

      if (name) return name;
    }

    current = current.parentElement;
  }

  return undefined;
};

const getFiberType = (fiber: ReactFiberNode): string | null => {
  if (typeof fiber.type === 'string') {
    return fiber.type;
  } else if (typeof fiber.type?.name === 'string') {
    return fiber.type?.name;
  } else if (typeof fiber.type?.displayName === 'string') {
    return fiber.type?.displayName;
  } else if (typeof fiber.elementType === 'string') {
    return fiber.elementType;
  }

  return null;
};

// TODO - this logic probably needs some work.
export const findReactComponentPath = (node: HTMLElement | SVGElement) => {
  const path: string[] = [];
  let source: FileData | null | undefined;
  let current: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;

  while (current && source !== null) {
    const fiber = getFiberFromDomNode(current);

    if (fiber) {
      let fiberCursor: ReactFiberNode | null | undefined = fiber;
      while (fiberCursor && source !== null) {
        const type = getFiberType(fiberCursor);

        if (fiberCursor._debugSource) {
          if (source === undefined) {
            source = fiberCursor._debugSource;
          } else if (source.fileName !== fiberCursor._debugSource.fileName) {
            source = null;
          }
        }

        // Emotion injects a lot of wrapper components, so we need to filter them out.
        if (type && !type.startsWith('Emotion')) {
          path.push(type);
        }

        fiberCursor = fiberCursor._debugOwner;
      }
    }

    current = current.parentElement;
  }

  if (path.length === 0) {
    return undefined;
  }

  if (path.length === 1) {
    return {
      sourceComponent: path[0],
      path: null,
    };
  }

  const [sourceComponent, ...rest] = path.reverse();

  let restItems = rest;

  // React will always include the literal DOM node rendered, even if it's a
  // component, (e.g. EuiPanel > div).  Trim off the DOM node if we have a literal
  // component.
  if (rest.length > 1 && /^[a-z]/.test(rest[rest.length - 1])) {
    restItems = rest.slice(0, -1);
  }

  return {
    path: [sourceComponent + ' : ', ...restItems.join(' > ')].join(''),
    sourceComponent,
  };
};

const findDebugSource = (node: HTMLElement | SVGElement): FileData | undefined => {
  let current: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;

  while (current) {
    const fiber = getFiberFromDomNode(current);
    if (fiber) {
      let fiberCursor: ReactFiberNode | null | undefined = fiber;
      while (fiberCursor) {
        if (fiberCursor._debugSource) {
          return fiberCursor._debugSource;
        }

        fiberCursor = fiberCursor._debugOwner;
      }
    }
    current = current.parentElement;
  }
  return;
};

export const getElementFromPoint = ({
  event,
  overlayId,
}: GetElementFromPointOptions): HTMLElement | SVGElement | undefined => {
  const elements = document.elementsFromPoint(event.clientX, event.clientY);

  for (const el of elements) {
    const isSvg = el instanceof SVGElement;
    const isOverlay = el.id === overlayId;
    const isPath = isSvg && el.tagName.toLowerCase() === 'path';
    const isNotInspectable = !(el instanceof HTMLElement) && !isSvg; // There is some edge case with SVG elements that are not inspectable

    if (isNotInspectable || isOverlay || isPath) continue;

    return el;
  }

  return undefined;
};

export const isKeyboardShortcut = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && isSingleQuote(event);

export const isMac = ((navigator as any)?.userAgentData?.platform || navigator.userAgent)
  .toLowerCase()
  .includes('mac');

export const setElementHighlight = ({ target, euiTheme }: SetElementHighlightOptions) => {
  const rectangle = target.getBoundingClientRect();
  const isInsidePortal = Boolean(target.closest('[data-euiportal="true"]'));

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'absolute',
    top: `${rectangle.top + window.scrollY}px`,
    left: `${rectangle.left + window.scrollX}px`,
    width: `${rectangle.width}px`,
    height: `${rectangle.height}px`,
    background: transparentize(euiTheme.colors.primary, 0.3),
    border: `2px solid ${euiTheme.colors.primary}`,
    pointerEvents: 'none',
    boxSizing: 'border-box',
    borderRadius: getComputedStyle(target).borderRadius,
    zIndex: isInsidePortal ? Number(euiTheme.levels.modal) + 1 : Number(euiTheme.levels.flyout) - 1,
  });

  document.body.appendChild(overlay);

  // Removes the overlay when the element is no longer visible, which can happen when using components like accordions or tabs
  // This won't add the overlay back if the element becomes visible again
  const observer = new IntersectionObserver(
    (entries) => {
      const isVisible = entries.some((entry) => entry.isIntersecting);
      if (overlay.parentNode && !isVisible) {
        overlay.parentNode.removeChild(overlay);
      }
    },
    { threshold: 0 }
  );

  observer.observe(target);

  return () => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    observer.disconnect();
  };
};

export const getInspectedElementData = async ({
  event,
  core,
  overlayId,
  euiTheme,
  setFlyoutRef,
  setIsInspecting,
  sourceComponent,
}: GetInspectedElementOptions) => {
  event.preventDefault();
  event.stopPropagation();

  const target = getElementFromPoint({ event, overlayId });

  if (!target) {
    setIsInspecting(false);
    return;
  }

  const fileData = findDebugSource(target);
  if (!fileData) {
    setIsInspecting(false);
    return;
  }

  const euiComponentName = getEuiComponentNameAtNode(target);

  const iconType =
    target instanceof SVGElement
      ? target.getAttribute(EUI_DATA_ICON_TYPE)
      : target.querySelector('svg')?.getAttribute(EUI_DATA_ICON_TYPE);

  const docLink = getEuiComponentDocLink(euiComponentName);

  await getComponentData({
    core,
    euiInfo: {
      componentName: euiComponentName || 'N/A',
      docsLink: docLink || 'https://eui.elastic.co/docs/components',
    },
    fileData,
    iconType: iconType || undefined,
    target,
    euiTheme,
    setFlyoutRef,
    setIsInspecting,
    sourceComponent,
  });
};
