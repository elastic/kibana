/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Static set of exported EUI component names from `@elastic/eui`.
 * Generated from `Object.keys(require('@elastic/eui')).filter(k => /^Eui[A-Z]/.test(k))`.
 *
 * This avoids `import * as EuiExports from '@elastic/eui'` which pulls the
 * entire EUI module into this package's dependency graph.
 *
 * Non-visual exports (utilities, contexts, observers, theme constants, etc.)
 * are intentionally excluded — only components that render visible UI belong here.
 *
 * To check for new components after an EUI upgrade, run from the Kibana root:
 * ```
 * node -e '
 *   const eui = require("@elastic/eui");
 *   const React = require("react");
 *   const { renderToString } = require("react-dom/server");
 *   const src = require("fs").readFileSync("src/platform/packages/shared/kbn-design-tools/src/lib/dom/resolve_eui_tag.ts", "utf8");
 *   const existing = new Set(src.match(/'\''Eui[A-Z]\w*'\''/g).map(s => s.slice(1, -1)));
 *   const fresh = Object.keys(eui).filter(k => /^Eui[A-Z]/.test(k)).filter(k => !existing.has(k)).sort();
 *   if (fresh.length) console.log("New EUI exports to triage:\n" + fresh.join("\n"));
 *   else console.log("No new Eui* exports found.");
 *   // List components whose root element lacks the expected euiXxx class:
 *   const noClass = [];
 *   for (const name of existing) {
 *     const C = eui[name]; if (!C) continue;
 *     const expected = name.charAt(0).toLowerCase() + name.slice(1);
 *     try {
 *       const html = renderToString(React.createElement(C, { children: "x", name: "t", onChange: ()=>{}, options: [], items: [], columns: [] }));
 *       const cls = (html.match(/class="([^"]+)"/) || [])[1] || "";
 *       if (!cls.split(" ").some(c => c === expected || c.startsWith(expected + "-") || c.startsWith(expected + "--")))
 *         noClass.push(name);
 *     } catch {}
 *   }
 *   if (noClass.length) console.log("\nComponents without matching CSS class (fall through to HTML tag):\n" + noClass.sort().join("\n"));
 * '
 * ```
 * Then manually add any new visual components to the set below.
 *
 * Resolution strategy: `resolveEuiTag` matches the convention where EUI renders
 * a class `euiXxx` for component `EuiXxx`. Components that don't follow this
 * (wrappers, providers, compound sub-components) fall through to the HTML tag
 * name. Classes are preserved on clones (only truncation utility classes like
 * `eui-textTruncate` are stripped).
 */
const EUI_COMPONENTS: ReadonlySet<string> = new Set([
  'EuiAbsoluteTab',
  'EuiAccordion',
  'EuiAspectRatio',
  'EuiAutoRefresh',
  'EuiAutoRefreshButton',
  'EuiAutoSizer',
  'EuiAvatar',
  'EuiBadge',
  'EuiBadgeGroup',
  'EuiBasicTable',
  'EuiBeacon',
  'EuiBetaBadge',
  'EuiBottomBar',
  'EuiBreadcrumbs',
  'EuiButton',
  'EuiButtonEmpty',
  'EuiButtonGroup',
  'EuiButtonIcon',
  'EuiCallOut',
  'EuiCard',
  'EuiCheckableCard',
  'EuiCheckbox',
  'EuiCheckboxControl',
  'EuiCheckboxGroup',
  'EuiCode',
  'EuiCodeBlock',
  'EuiCollapsibleNav',
  'EuiCollapsibleNavBeta',
  'EuiCollapsibleNavGroup',
  'EuiCollapsibleNavItem',
  'EuiColorModeContext',
  'EuiColorPaletteDisplay',
  'EuiColorPalettePicker',
  'EuiColorPicker',
  'EuiColorPickerSwatch',
  'EuiComboBox',
  'EuiComboBoxInput',
  'EuiComboBoxOptionsList',
  'EuiComboBoxPill',
  'EuiComboBoxTitle',
  'EuiComment',
  'EuiCommentEvent',
  'EuiCommentList',
  'EuiCommonlyUsedTimeRanges',
  'EuiComponentDefaultsContext',
  'EuiComponentDefaultsProvider',
  'EuiConfirmModal',
  'EuiContext',
  'EuiContextMenu',
  'EuiContextMenuItem',
  'EuiContextMenuPanel',
  'EuiContextMenuPanelTitle',
  'EuiCopy',
  'EuiDataGrid',
  'EuiDataGridToolbarControl',
  'EuiDatePicker',
  'EuiDatePickerRange',
  'EuiDatePopoverButton',
  'EuiDatePopoverContent',
  'EuiDescribedFormGroup',
  'EuiDescriptionList',
  'EuiDescriptionListDescription',
  'EuiDescriptionListTitle',
  'EuiDragDropContext',
  'EuiDraggable',
  'EuiDroppable',
  'EuiDualRange',
  'EuiEmptyPrompt',
  'EuiExpression',
  'EuiFacetButton',
  'EuiFacetGroup',
  'EuiFieldNumber',
  'EuiFieldPassword',
  'EuiFieldSearch',
  'EuiFieldText',
  'EuiFilePicker',
  'EuiFilterButton',
  'EuiFilterGroup',
  'EuiFilterSelectItem',
  'EuiFlexGrid',
  'EuiFlexGroup',
  'EuiFlexItem',
  'EuiFlyout',
  'EuiFlyoutBody',
  'EuiFlyoutFooter',
  'EuiFlyoutHeader',
  'EuiFlyoutMenu',
  'EuiFlyoutResizable',
  'EuiForm',
  'EuiFormAppend',
  'EuiFormControlButton',
  'EuiFormControlLayout',
  'EuiFormControlLayoutDelimited',
  'EuiFormControlLayoutIcons',
  'EuiFormErrorText',
  'EuiFormFieldset',
  'EuiFormHelpText',
  'EuiFormLabel',
  'EuiFormLegend',
  'EuiFormPrepend',
  'EuiFormRow',
  'EuiGlobalToastList',
  'EuiGlobalToastListItem',
  'EuiHeader',
  'EuiHeaderAlert',
  'EuiHeaderBreadcrumbs',
  'EuiHeaderLink',
  'EuiHeaderLinks',
  'EuiHeaderLogo',
  'EuiHeaderSection',
  'EuiHeaderSectionItem',
  'EuiHeaderSectionItemButton',
  'EuiHealth',
  'EuiHighlight',
  'EuiHorizontalRule',
  'EuiI18n',
  'EuiIcon',
  'EuiIconTip',
  'EuiImage',
  'EuiInMemoryTable',
  'EuiInlineEditText',
  'EuiInlineEditTitle',
  'EuiInnerText',
  'EuiInputPopover',
  'EuiKeyPadMenu',
  'EuiKeyPadMenuItem',
  'EuiLink',
  'EuiListGroup',
  'EuiListGroupItem',
  'EuiLoadingChart',
  'EuiLoadingElastic',
  'EuiLoadingLogo',
  'EuiLoadingSpinner',
  'EuiMarkdownContext',
  'EuiMarkdownEditor',
  'EuiMarkdownEditorHelpButton',
  'EuiMarkdownFormat',
  'EuiModal',
  'EuiModalBody',
  'EuiModalFooter',
  'EuiModalHeader',
  'EuiModalHeaderTitle',
  'EuiNotificationBadge',
  'EuiOverlayMask',
  'EuiPage',
  'EuiPageBody',
  'EuiPageHeader',
  'EuiPageHeaderContent',
  'EuiPageHeaderSection',
  'EuiPageSection',
  'EuiPageSidebar',
  'EuiPageTemplate',
  'EuiPagination',
  'EuiPaginationButton',
  'EuiPanel',
  'EuiPinnableListGroup',
  'EuiPopover',
  'EuiPopoverFooter',
  'EuiPopoverTitle',
  'EuiProgress',
  'EuiProvider',
  'EuiQuickSelect',
  'EuiQuickSelectPanel',
  'EuiQuickSelectPopover',
  'EuiRadio',
  'EuiRadioGroup',
  'EuiRange',
  'EuiRelativeTab',
  'EuiResizableButton',
  'EuiResizableContainer',
  'EuiSearchBar',
  'EuiSearchBarFilters',
  'EuiSelect',
  'EuiSelectable',
  'EuiSelectableList',
  'EuiSelectableListItem',
  'EuiSelectableMessage',
  'EuiSelectableSearch',
  'EuiSelectableTemplateSitewide',
  'EuiSideNav',
  'EuiSkeletonCircle',
  'EuiSkeletonLoading',
  'EuiSkeletonRectangle',
  'EuiSkeletonText',
  'EuiSkeletonTitle',
  'EuiSpacer',
  'EuiSplitButton',
  'EuiSplitPanel',
  'EuiStat',
  'EuiStep',
  'EuiStepHorizontal',
  'EuiStepNumber',
  'EuiSteps',
  'EuiStepsHorizontal',
  'EuiSubSteps',
  'EuiSuperDatePicker',
  'EuiSuperSelect',
  'EuiSuperSelectControl',
  'EuiSuperUpdateButton',
  'EuiSwitch',
  'EuiSystemContext',
  'EuiTab',
  'EuiTabbedContent',
  'EuiTable',
  'EuiTableBody',
  'EuiTableFooter',
  'EuiTableFooterCell',
  'EuiTableHeader',
  'EuiTableHeaderCell',
  'EuiTableHeaderCellCheckbox',
  'EuiTableHeaderMobile',
  'EuiTablePagination',
  'EuiTableRow',
  'EuiTableRowCell',
  'EuiTableRowCellCheckbox',
  'EuiTableSortMobile',
  'EuiTableSortMobileItem',
  'EuiTabs',
  'EuiText',
  'EuiTextAlign',
  'EuiTextArea',
  'EuiTextBlockTruncate',
  'EuiTextColor',
  'EuiTextTruncate',
  'EuiTimeline',
  'EuiTimelineItem',
  'EuiTimelineItemEvent',
  'EuiTimelineItemIcon',
  'EuiTitle',
  'EuiToast',
  'EuiToken',
  'EuiToolTip',
  'EuiTour',
  'EuiTourStep',
  'EuiTourStepIndicator',
  'EuiTreeView',
  'EuiWrappingPopover',
]);

const EUI_CLASS_RE = /^eui[A-Z]/;

/**
 * Map a CSS class name (e.g. `euiAvatar`) to its EUI component name
 * (e.g. `EuiAvatar`), but only if that component is exported
 * from `@elastic/eui`.
 *
 * @param el - The element to inspect.
 * @returns The EUI component name, or `null`.
 */
export const resolveEuiTag = (el: Element): string | null => {
  for (const cls of el.classList) {
    if (EUI_CLASS_RE.test(cls)) {
      const candidate = cls.charAt(0).toUpperCase() + cls.slice(1);
      if (EUI_COMPONENTS.has(candidate)) return candidate;
    }
  }
  return null;
};

/**
 * Resolves a human-readable tag name for an element. Tries EUI class names
 * first, then falls back to the HTML tag.
 *
 * @param el - The element to resolve.
 * @returns A human-readable tag name.
 */
export const resolveTag = (el: Element): string => {
  return resolveEuiTag(el) ?? el.tagName.toLowerCase();
};
