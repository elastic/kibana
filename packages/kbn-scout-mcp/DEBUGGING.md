# Debugging Test Cases with Scout MCP in Cursor

This guide shows you how to use Scout MCP in Cursor to debug failing test cases interactively.

## Quick Debug Commands

When a test fails, ask Cursor:

```
Use Scout to help me debug - show me:
1. Current URL
2. Page title
3. Take a screenshot
4. Get a page snapshot
```

## Common Debugging Scenarios

### Scenario 1: Element Not Found

**Problem**: Your test can't find an element.

**Debug with Cursor**:
```
The test is failing because it can't find the "Save" button.
Use Scout to:
1. Take a screenshot of the current page
2. Get an accessibility snapshot
3. Show me all clickable elements on the page
```

**What Scout will do**:
- Take a screenshot so you can see the actual page state
- Get a page snapshot showing all elements and their test subjects
- Help you identify the correct selector

**Follow-up**:
```
Search the snapshot for elements containing "save" or "button"
```

### Scenario 2: Page Didn't Load

**Problem**: Test fails because page didn't load correctly.

**Debug with Cursor**:
```
My test fails when navigating to Discover. Use Scout to:
1. Navigate to Discover
2. Get the current URL
3. Wait for 5 seconds
4. Take a screenshot
5. Get a page snapshot
6. Check if there are any error toasts
```

**What Scout will do**:
- Navigate and capture the actual state
- Show if you ended up on the right page
- Reveal any error messages or loading states
- Display the page structure

### Scenario 3: Filter Not Applied

**Problem**: Test adds a filter but it doesn't appear.

**Debug with Cursor**:
```
My test adds a filter but it's not showing. Use Scout to:
1. Navigate to Discover
2. Take a screenshot (before adding filter)
3. Add a filter for field "status.keyword" is "200"
4. Wait 2 seconds
5. Take another screenshot (after adding filter)
6. Get a snapshot of the filter bar area
```

**What Scout will do**:
- Show before/after screenshots
- Reveal timing issues (if filter takes time to appear)
- Show the actual filter bar state

### Scenario 4: Authentication Issues

**Problem**: Test fails because user isn't logged in correctly.

**Debug with Cursor**:
```
My test is failing with auth errors. Use Scout to:
1. Get current authentication status
2. Check the current URL
3. Take a screenshot
4. Try logging in as admin
5. Check auth status again
6. Navigate to the protected page
```

**What Scout will do**:
- Show if you're actually logged in
- Reveal if you're on a login page
- Show what role you have
- Verify successful authentication

### Scenario 5: Timing Issues

**Problem**: Test fails intermittently due to race conditions.

**Debug with Cursor**:
```
My test sometimes fails when clicking "Create dashboard". Use Scout to:
1. Navigate to Dashboard
2. Take a screenshot
3. Wait for the "Create dashboard" button to be visible
4. Take another screenshot
5. Click the button
6. Wait for the new dashboard page to load
7. Take a final screenshot
8. Verify we're on the right page
```

**What Scout will do**:
- Show loading states at each step
- Reveal if button appears after initial page load
- Help identify proper wait conditions

### Scenario 6: Data View Selection Fails

**Problem**: Test can't select a data view.

**Debug with Cursor**:
```
My test can't select the "logs-*" data view. Use Scout to:
1. Navigate to Discover
2. Take a screenshot
3. List all EUI combo boxes on the page
4. Get a snapshot showing the data view selector
5. Try to click on the data view selector
6. Take a screenshot of the dropdown
7. List available options in the dropdown
```

**What Scout will do**:
- Show you what data views are available
- Reveal the correct test subject or selector
- Show the dropdown state

## Interactive Debugging Workflow

### Step 1: Reproduce the Failure

```
Use Scout to run my failing test scenario step by step:
1. Login as admin
2. Navigate to Dashboard
3. Click "Create new dashboard"
[Stop here and take a screenshot]
```

### Step 2: Inspect the State

```
At this point in the test, show me:
1. Current URL
2. Page snapshot
3. Screenshot
4. Are there any error toasts?
```

### Step 3: Identify the Issue

```
Based on the screenshot, I see the "Add panel" button is disabled.
Use Scout to check if there are any loading indicators still visible.
```

### Step 4: Find the Solution

```
Wait for the loading indicator to disappear, then try clicking "Add panel" again.
```

### Step 5: Verify the Fix

```
Now run the complete test with the proper wait condition and verify it passes.
```

## Debugging Specific Components

### EUI Combo Box Issues

```
Debug the combo box with test subject "fieldSelector":
1. Take a screenshot
2. Get info about this combo box (selected values, options)
3. Try to click on it
4. Take a screenshot of the opened dropdown
5. List all available options
```

### Data Grid Issues

```
Debug the data grid:
1. Take a screenshot of the grid
2. Get a snapshot of the grid area
3. Get the row count
4. Get cell values from the first row
5. Check if the grid is loading
```

### Toast Notification Issues

```
Debug toast notifications:
1. Take a screenshot
2. Check if there are any visible toasts
3. Get the toast messages and types (success, error, warning)
4. Wait for toasts to disappear
5. Take another screenshot
```

## Advanced Debugging Techniques

### Compare Expected vs Actual State

```
My test expects to see a filter for "status:200" but it's not there.

Use Scout to:
1. Get current page snapshot
2. Search for filter-related elements in the snapshot
3. Take a screenshot of the filter bar
4. List all active filters using the filterBar page object
5. Compare with expected filter
```

### Debug Element Selector

```
My test uses selector '[data-test-subj="discoverSaveButton"]' but it's not working.

Use Scout to:
1. Get page snapshot
2. Search the snapshot for elements containing "save"
3. Find the correct test subject or selector
4. Try clicking with the correct selector
```

### Debug Page Object Method

```
The discover.selectDataView("logs-*") method is failing.

Use Scout to:
1. Navigate to Discover
2. Take a screenshot
3. Get the list of available page object methods for discover
4. Try calling the method step-by-step
5. Show what happens at each step
```

### Capture Failure Context

```
When my test fails at the dashboard save step:
1. Take a screenshot (save as "failure-dashboard-save.png")
2. Get page snapshot (save to text file)
3. Get current URL
4. Check auth status
5. List all visible buttons on the page
6. Check for error toasts or messages
```

## Debugging Page Object Issues

### Check Available Methods

```
List all methods available on the "discover" page object
```

### Test Individual Methods

```
Test each step of the discover page object:
1. discover.goto() - verify navigation works
2. discover.selectDataView("logs-*") - verify data view selection
3. discover.saveSearch("Test") - verify save functionality
Take screenshots after each step.
```

### Verify Method Parameters

```
Show me the signature and parameters for discover.selectDataView method.
What format does it expect?
```

## Common Issues and Solutions

### Issue: "Element not attached to DOM"

**Debug**:
```
Use Scout to:
1. Wait for the element to be stable (attached)
2. Take a screenshot
3. Retry the action
```

### Issue: "Element is not visible"

**Debug**:
```
Use Scout to:
1. Get a snapshot showing the element
2. Check if the element is hidden by CSS
3. Check if the element is off-screen
4. Scroll the element into view
5. Try the action again
```

### Issue: "Timeout waiting for element"

**Debug**:
```
Use Scout to:
1. Take a screenshot to see current page state
2. Get page snapshot to see if element exists but isn't ready
3. Check for loading indicators
4. Increase timeout and retry
5. Verify you're on the correct page
```

### Issue: "Wrong page loaded"

**Debug**:
```
Use Scout to:
1. Get current URL - verify it's what you expect
2. Get page title - verify page identity
3. Take a screenshot - see what actually loaded
4. Check for redirects or error pages
5. Verify authentication state
```

### Issue: "Action succeeds but test fails"

**Debug**:
```
Use Scout to:
1. Perform the action (e.g., save dashboard)
2. Wait for success indicator (toast notification)
3. Take a screenshot
4. Verify the success toast appears
5. Wait for navigation/redirect if expected
6. Verify final state
```

## Debugging Test Data Issues

### Verify Data View Exists

```
Use Scout to:
1. Navigate to Stack Management > Data Views
2. Take a screenshot
3. Search for the data view "logs-*"
4. Verify it exists and has data
```

### Check Sample Data

```
Use Scout to:
1. Navigate to Discover
2. Select the data view
3. Check the hit count
4. Take a screenshot of the results
5. Verify data is loaded
```

## Creating a Debug Report

When you need to share a failing test:

```
Create a debug report for my failing test:
1. Take a screenshot of the failure state
2. Get a full page snapshot
3. Get current URL and page title
4. Check authentication status
5. List any error messages or toasts
6. Save all this information in a format I can share with the team
```

## Best Practices for Debugging

1. **Always take screenshots first** - Visual context is crucial
   ```
   Take a screenshot before investigating further
   ```

2. **Use snapshots for structure** - See the DOM without visual clutter
   ```
   Get an accessibility snapshot to see page structure
   ```

3. **Check state at each step** - Don't assume steps succeeded
   ```
   After navigating, verify the URL and take a screenshot
   ```

4. **Look for loading states** - Many failures are timing issues
   ```
   Check if there are any loading indicators or spinners visible
   ```

5. **Verify authentication** - Auth issues are common
   ```
   Check if I'm logged in and what role I have
   ```

6. **Compare selectors** - Find the correct test subject
   ```
   Get a snapshot and search for the element I'm trying to interact with
   ```

7. **Test in isolation** - Break complex tests into steps
   ```
   Just test the navigation step first, take a screenshot, then stop
   ```

8. **Save debug artifacts** - Keep screenshots and snapshots
   ```
   Save screenshot as "debug-step1.png" before proceeding
   ```

## Tips for Using Scout MCP Debugging in Cursor

1. **Be specific about what failed**: Tell Cursor exactly which step failed
2. **Ask for screenshots liberally**: Visual feedback is invaluable
3. **Use snapshots for element hunting**: Find correct selectors easily
4. **Test incrementally**: Don't run the whole test at once
5. **Compare states**: Before/after screenshots reveal issues
6. **Ask Cursor to explain**: Have Cursor interpret screenshots and snapshots
7. **Iterate quickly**: Fix one issue, test, repeat

## Example Debug Session

```
You: My test that creates a dashboard is failing at the save step

Cursor: Let me help debug this. I'll run the test up to the failure point.

[Scout navigates to Dashboard, creates new dashboard]

Cursor: I've reproduced it up to the save step. Let me capture the state:
- Screenshot saved: before-save.png
- Page snapshot obtained
- Current URL: http://localhost:5601/app/dashboards/create
- Auth status: Logged in as admin

You: Can you see the Save button in the screenshot?

Cursor: Yes, I can see a "Save" button, but it appears to be disabled (grayed out).
Looking at the snapshot, the test subject is "dashboardSaveBtn" and it has
attribute "disabled=true".

You: Why is it disabled?

Cursor: Let me check... I see there's a loading indicator still visible and the
dashboard has no title yet. The Save button is disabled until a title is provided.

You: Ah! Can you fix the test to add a title first?

Cursor: Yes, I'll modify the test to:
1. Enter a title in the dashboard title field
2. Wait for the Save button to become enabled
3. Then click Save

Let me run this now...
[Test runs successfully]

Cursor: ✓ Test passed! The issue was the missing dashboard title.
```

This interactive debugging approach with Scout MCP in Cursor makes it much easier to troubleshoot failing tests!
