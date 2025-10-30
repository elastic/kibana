# Using Scout MCP in Cursor for Testing

This guide shows you how to use Scout MCP in Cursor to run test cases and interact with Kibana.

## Prerequisites

1. Kibana is running locally: `http://localhost:5601`
2. Scout MCP is configured in Cursor (see README.md)
3. Cursor has been restarted after configuration

## Basic Test Scenarios

### Scenario 1: Test Discover Navigation

Ask Cursor:
```
Use Scout to navigate to the Discover app and verify it loads correctly
```

Cursor will:
1. Navigate to Discover
2. Wait for the page to load
3. Verify key elements are present

### Scenario 2: Test Dashboard Creation

Ask Cursor:
```
Use Scout to create a new dashboard, add some panels from the library, and save it as "Test Dashboard"
```

Cursor will:
1. Navigate to Dashboard app
2. Create a new dashboard
3. Add panels from the visualization library
4. Save the dashboard with the specified name

### Scenario 3: Test Filter Functionality

Ask Cursor:
```
Use Scout to navigate to Discover, add a filter for field "response.keyword" is "200", and verify the filter appears
```

Cursor will:
1. Navigate to Discover
2. Use the FilterBar page object to add the filter
3. Verify the filter is displayed and enabled

### Scenario 4: Test Data View Selection

Ask Cursor:
```
Use Scout to navigate to Discover and select the "logs-*" data view
```

Cursor will:
1. Navigate to Discover
2. Use the Discover page object to select the data view
3. Verify the selection

### Scenario 5: Visual Testing

Ask Cursor:
```
Use Scout to navigate to the Dashboard app, open "My Dashboard", and take a full-page screenshot
```

Cursor will:
1. Navigate to Dashboard
2. Load the specified dashboard
3. Take a screenshot and save it

## Working with Page Objects

### List Available Page Objects

Ask Cursor:
```
List all available Scout page objects
```

Common page objects include:
- `discover` - Discover app interactions
- `dashboard` - Dashboard management
- `filterBar` - Filter operations
- `datePicker` - Time range selection
- `toasts` - Toast notifications
- `collapsibleNav` - Navigation menu

### Using Page Object Methods

Ask Cursor:
```
Use Scout's discover page object to:
1. Navigate to Discover
2. Select the "kibana_sample_data_logs" data view
3. Save the search as "My Saved Search"
```

## Working with EUI Components

### List Available Components

Ask Cursor:
```
List all available Scout EUI components
```

Available components:
- `comboBox` - Dropdown selection with search
- `dataGrid` - Data tables
- `checkBox` - Checkboxes
- `toast` - Notification toasts
- `selectable` - Selectable lists

### Using EUI Components

Ask Cursor:
```
Use Scout to interact with the combo box with test subject "dataViewSelector" and select "logs-*"
```

## Authentication Testing

### Test Different User Roles

Ask Cursor:
```
Use Scout to:
1. Login as admin
2. Navigate to Dashboard
3. Verify the user can create new dashboards
4. Logout
```

Available roles:
- `admin` - Full access
- `viewer` - Read-only access
- `privileged` - Elevated permissions

## Debugging Failed Tests

### Get Page Snapshot

Ask Cursor:
```
Use Scout to get an accessibility snapshot of the current page
```

This provides a text representation of the page structure without screenshots.

### Take Screenshot

Ask Cursor:
```
Use Scout to take a screenshot of the current page
```

### Check Current State

Ask Cursor:
```
Use Scout to tell me:
1. Current URL
2. Page title
3. Whether I'm logged in
```

## Advanced Testing Scenarios

### Test User Flow End-to-End

Ask Cursor:
```
Use Scout to test this user flow:
1. Login as admin
2. Navigate to Discover
3. Select "kibana_sample_data_logs" data view
4. Add filter: field.keyword is "value"
5. Save search as "Filtered Logs"
6. Navigate to Dashboard
7. Create new dashboard
8. Add the saved search
9. Save dashboard as "Logs Dashboard"
10. Take a screenshot
```

### Test Error Handling

Ask Cursor:
```
Use Scout to test error handling:
1. Navigate to Discover
2. Try to select a non-existent data view
3. Verify an error message appears
4. Take a screenshot of the error
```

### Test Form Validation

Ask Cursor:
```
Use Scout to test the dashboard save form:
1. Navigate to Dashboard and create new
2. Try to save without entering a name
3. Verify validation error appears
4. Enter a valid name and save
5. Verify success
```

## Best Practices

1. **Be Specific**: Tell Cursor exactly what you want to test
   - Good: "Navigate to Discover and verify the data table loads"
   - Bad: "Test Discover"

2. **Use Page Objects**: They're more reliable than raw selectors
   - Good: "Use the discover page object to select a data view"
   - Bad: "Click on the data view selector"

3. **Include Verification**: Always verify the action succeeded
   - Good: "Add a filter and verify it appears in the filter bar"
   - Bad: "Add a filter"

4. **Take Screenshots**: Helpful for debugging and documentation
   - Add "take a screenshot" to your test scenarios

5. **Break Down Complex Tests**: Split into smaller steps
   - Instead of one long test, break into logical scenarios

## Common Issues

### "Element not found"
- Add a wait step: "Wait for the element to appear before clicking"
- Use test subjects instead of CSS selectors

### "Page didn't load"
- Add explicit waits: "Wait for the loading indicator to disappear"
- Increase timeout: "Wait up to 30 seconds for the page to load"

### "Action failed"
- Take a screenshot to see the current state
- Get a page snapshot to inspect the DOM structure

## Tips for Writing Tests with Cursor

1. Start simple and build up complexity
2. Use natural language - Cursor understands context
3. Reference Scout page objects when available
4. Ask Cursor to explain what it's doing
5. Have Cursor take screenshots at key points
6. Ask Cursor to verify results after actions

## Example Test Session

```
You: Let's test the Discover app

Cursor: I'll help you test Discover. What would you like to test?

You: Navigate to Discover, select the kibana_sample_data_logs data view,
add a filter for response.keyword is 200, and verify the results

Cursor: [Uses Scout to execute the test]
- ✓ Navigated to Discover
- ✓ Selected kibana_sample_data_logs data view
- ✓ Added filter: response.keyword is "200"
- ✓ Verified filter is active
- ✓ Confirmed results are filtered

You: Great! Now take a screenshot

Cursor: [Takes screenshot using Scout]
Screenshot saved as discover-filtered.png

You: Can you save this search as "Success Logs"?

Cursor: [Uses discover page object to save search]
✓ Search saved as "Success Logs"
```

## Next Steps

- Explore available page objects with `scout_list_page_objects`
- Try different EUI components with `scout_list_eui_components`
- Build more complex test scenarios
- Create reusable test patterns
- Share successful test approaches with your team
