Use registries to extend the dashboard application.

- Use the [embeddable registry](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/search/register_search_embeddable.ts) to add new panel types.
- Use the [ADD_PANEL_TRIGGER trigger](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/search/register_add_search_panel_action.tsx) trigger to add an action to dashboard's **Add panel** menu. Use *grouping* to nest related panel types and avoid bloating the menu. Please reach out to *@elastic/kibana-presentation* team to coordinate menu updates.
- Use the [panel placement registry](https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/field_list/register_field_list_embeddable.ts) to configure initial panel placement. Panel placement lets you configure the width, height, and placement strategy when panels get added to a dashboard.

Register actions to triggers to extend dashboard panels.

- Use the **CONTEXT_MENU_TRIGGER** trigger to add an action to a panel's context menu.
- Use the **PANEL_HOVER_TRIGGER** trigger to add an action to a panel's hover menu.
- Use the **PANEL_BADGE_TRIGGER** trigger to add a badge to a panel's title bar.
- Use the **PANEL_NOTIFICATION_TRIGGER** trigger to add a notification to the top-right corner of a panel.

Register actions to triggers to extend dashboard panel interactions.

- Use the **SELECT_RANGE_TRIGGER** trigger to add an action on selecting a range.
- Use the **VALUE_CLICK_TRIGGER** trigger to add an action on clicking a value.
- Use the **MULTI_VALUE_CLICK_TRIGGER** trigger to add an action on selecting multiple values.
- Use the **CELL_VALUE_TRIGGER** trigger to add an action to cell value actions.

