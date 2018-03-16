import Slugify from '../string/slugify';

import AccessibilityExample
  from '../../views/accessibility/accessibility_example';

import ActionItemExample
  from '../../views/action_item/action_item_example';

import BadgeExample
  from '../../views/badge/badge_example';

import BarExample
  from '../../views/bar/bar_example';

import ButtonExample
  from '../../views/button/button_example';

import CardExample
  from '../../views/card/card_example';

import CodeEditor
  from '../../views/code_editor/code_editor_example';

import CollapseButtonExample
  from '../../views/collapse_button/collapse_button_example';

import ColorPickerExample
  from '../../views/color_picker/color_picker_example';

import ColumnExample
  from '../../views/column/column_example';

import ContextMenuExample
  from '../../views/context_menu/context_menu_example';

import EventExample
  from '../../views/event/event_example';

import EventsSandbox
  from '../../views/event/events_sandbox';

import ExpressionExample
  from '../../views/expression/expression_example';

import FlexExample
  from '../../views/flex/flex_example';

import FormExample
  from '../../views/form/form_example';

import FormLayoutExample
  from '../../views/form_layout/form_layout_example';

import GalleryExample
  from '../../views/gallery/gallery_example';

import HeaderBarExample
  from '../../views/header_bar/header_bar_example';

import HeaderBarSandbox
  from '../../views/header_bar/header_bar_sandbox';

import IconExample
  from '../../views/icon/icon_example';

import InfoButtonExample
  from '../../views/info_button/info_button_example';

import InfoPanelExample
  from '../../views/info_panel/info_panel_example';

import LinkExample
  from '../../views/link/link_example';

import LocalNavExample
  from '../../views/local_nav/local_nav_example';

import MenuExample
  from '../../views/menu/menu_example';

import MenuButtonExample
  from '../../views/menu_button/menu_button_example';

import MicroButtonExample
  from '../../views/micro_button/micro_button_example';

import ModalExample
  from '../../views/modal/modal_example';

import NoticeSandbox
  from '../../views/notice/notice_sandbox';

import PagerExample
  from '../../views/pager/pager_example';

import PanelExample
  from '../../views/panel/panel_example';

import PanelSimpleExample
  from '../../views/panel_simple/panel_simple_example';

import PopoverExample
  from '../../views/popover/popover_example';

import EmptyTablePromptExample
  from '../../views/empty_table_prompt/empty_table_prompt_example';

import StatusTextExample
  from '../../views/status_text/status_text_example';

import TableExample
  from '../../views/table/table_example';

import TabsExample
  from '../../views/tabs/tabs_example';

import ToggleButtonExample
  from '../../views/toggle_button/toggle_button_example';

import ToolBarExample
  from '../../views/tool_bar/tool_bar_example';

import TypographyExample
  from '../../views/typography/typography_example';

import VerticalRhythmExample
  from '../../views/vertical_rhythm/vertical_rhythm_example';

import ViewSandbox
  from '../../views/view/view_sandbox';

// Component route names should match the component name exactly.
const components = [{
  name: 'Accessibility',
  component: AccessibilityExample,
  hasReact: true,
}, {
  name: 'ActionItem',
  component: ActionItemExample,
  hasReact: true,
}, {
  name: 'Badge',
  component: BadgeExample,
}, {
  name: 'Bar',
  component: BarExample,
  hasReact: true,
}, {
  name: 'Button',
  component: ButtonExample,
  hasReact: true,
}, {
  name: 'Card',
  component: CardExample,
  hasReact: true,
}, {
  name: 'CodeEditor',
  component: CodeEditor,
  hasReact: true,
}, {
  name: 'CollapseButton',
  component: CollapseButtonExample,
  hasReact: true,
}, {
  name: 'ColorPicker',
  component: ColorPickerExample,
  hasReact: true,
}, {
  name: 'Column',
  component: ColumnExample,
}, {
  name: 'CollapseButton',
  component: CollapseButtonExample,
  hasReact: true,
}, {
  name: 'ContextMenu',
  component: ContextMenuExample,
  hasReact: true,
}, {
  name: 'EmptyTablePrompt',
  component: EmptyTablePromptExample,
  hasReact: true,
}, {
  name: 'Event',
  component: EventExample,
  hasReact: true,
}, {
  name: 'Expression',
  component: ExpressionExample,
  hasReact: true,
}, {
  name: 'Flex',
  component: FlexExample,
}, {
  name: 'Form',
  component: FormExample,
}, {
  name: 'FormLayout',
  component: FormLayoutExample,
  hasReact: true,
}, {
  name: 'Gallery',
  component: GalleryExample,
  hasReact: true,
}, {
  name: 'HeaderBar',
  component: HeaderBarExample,
  hasReact: true,
}, {
  name: 'Icon',
  component: IconExample,
}, {
  name: 'InfoButton',
  component: InfoButtonExample,
  hasReact: true,
}, {
  name: 'InfoPanel',
  component: InfoPanelExample,
}, {
  name: 'Link',
  component: LinkExample,
}, {
  name: 'LocalNav',
  component: LocalNavExample,
  hasReact: true,
}, {
  name: 'Menu',
  component: MenuExample,
  hasReact: true,
}, {
  name: 'MenuButton',
  component: MenuButtonExample,
}, {
  name: 'MicroButton',
  component: MicroButtonExample,
}, {
  name: 'Modal',
  component: ModalExample,
  hasReact: true,
}, {
  name: 'Pager',
  component: PagerExample,
  hasReact: true,
}, {
  name: 'Panel',
  component: PanelExample,
}, {
  name: 'PanelSimple',
  component: PanelSimpleExample,
  hasReact: true,
}, {
  name: 'Popover',
  component: PopoverExample,
  hasReact: true,
}, {
  name: 'StatusText',
  component: StatusTextExample,
}, {
  name: 'Table',
  component: TableExample,
  hasReact: true,
}, {
  name: 'Tabs',
  component: TabsExample,
  hasReact: true,
}, {
  name: 'ToggleButton',
  component: ToggleButtonExample,
}, {
  name: 'ToolBar',
  component: ToolBarExample,
  hasReact: true,
}, {
  name: 'Typography',
  component: TypographyExample,
}, {
  name: 'VerticalRhythm',
  component: VerticalRhythmExample,
}];

const sandboxes = [{
  name: 'Events',
  component: EventsSandbox,
}, {
  name: 'HeaderBar with Table',
  component: HeaderBarSandbox,
}, {
  name: 'Notice',
  component: NoticeSandbox,
}, {
  name: 'View',
  component: ViewSandbox,
}];

const allRoutes = components.concat(sandboxes);

export default {
  components: Slugify.each(components, 'name', 'path'),
  sandboxes: Slugify.each(sandboxes, 'name', 'path'),
  getAppRoutes: function getAppRoutes() {
    return allRoutes;
  },
  getPreviousRoute: function getPreviousRoute(routeName) {
    const index = allRoutes.findIndex(item => {
      return item.name === routeName;
    });

    return index >= 0 ? allRoutes[index - 1] : undefined;
  },
  getNextRoute: function getNextRoute(routeName) {
    const index = allRoutes.findIndex(item => {
      return item.name === routeName;
    });

    return index < allRoutes.length - 1 ? allRoutes[index + 1] : undefined;
  },
};
