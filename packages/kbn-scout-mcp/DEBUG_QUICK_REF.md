# Scout MCP Debugging - Quick Reference

## 🚨 When a Test Fails

### Step 1: Capture Current State
```
Use Scout to show me the current state:
1. Take a screenshot
2. Get current URL
3. Get page title
4. Check auth status
```

### Step 2: Get Detailed Info
```
Use Scout to get a page snapshot and show me all elements with "button" in them
```

### Step 3: Check for Errors
```
Use Scout to check if there are any error toasts or messages visible
```

## 🔍 Common Debug Commands

### Take Screenshot
```
Take a screenshot of the current page
```

### Get Page Snapshot
```
Get an accessibility snapshot of the page
```

### Check Current Location
```
What's the current URL and page title?
```

### Find Element
```
Get a page snapshot and search for elements containing "save"
```

### Check Authentication
```
Check my current authentication status
```

### Wait and Retry
```
Wait 3 seconds, take a screenshot, then try clicking the button again
```

### Check for Loading States
```
Check if there are any loading indicators or spinners visible
```

### Inspect Specific Element
```
Get info about the element with test subject "saveButton" - is it visible? enabled?
```

## 🐛 Debug by Error Type

### "Element not found"
```
1. Take a screenshot - is it on the right page?
2. Get page snapshot - does the element exist?
3. Search snapshot for similar elements - is the selector wrong?
```

### "Timeout waiting for element"
```
1. Take a screenshot - what's actually on screen?
2. Check for loading indicators
3. Increase wait time and retry
```

### "Element not visible"
```
1. Get page snapshot - does element exist in DOM?
2. Take screenshot - is element hidden or off-screen?
3. Try scrolling element into view
```

### "Click had no effect"
```
1. Take screenshot before click
2. Perform click
3. Wait 2 seconds
4. Take screenshot after click
5. Compare - did anything change?
```

### "Wrong page loaded"
```
1. Get current URL - where did we actually end up?
2. Take screenshot - what page is this?
3. Check for redirects or error messages
```

### "Authentication failed"
```
1. Check auth status
2. Take screenshot
3. Try logging in again
4. Check auth status again
```

## 📸 Screenshot Strategy

### Before/After Comparison
```
Use Scout to:
1. Take screenshot (save as "before.png")
2. Perform the action
3. Wait 1 second
4. Take screenshot (save as "after.png")
```

### Multi-Step Capture
```
Use Scout to:
1. Navigate to Dashboard
2. Take screenshot (step1-navigate.png)
3. Click "Create new"
4. Take screenshot (step2-create.png)
5. Enter title
6. Take screenshot (step3-title.png)
7. Click Save
8. Take screenshot (step4-save.png)
```

## 🔎 Finding the Right Selector

### Search by Text
```
Get a page snapshot and find all elements containing the text "Save"
```

### Search by Type
```
Get a snapshot and show me all buttons on the page
```

### Search by Test Subject
```
Get a snapshot and find elements with test-subject starting with "dashboard"
```

### List Clickable Elements
```
Get a snapshot and list all clickable elements (buttons, links)
```

## 🎯 Debugging Page Objects

### List Available Methods
```
List all methods for the "dashboard" page object
```

### Test Method Step-by-Step
```
Use Scout to test dashboard.saveDashboard step by step:
1. Take screenshot
2. Try calling saveDashboard("Test")
3. Take screenshot after
4. Show me any errors
```

### Verify Parameters
```
What parameters does discover.selectDataView() expect?
```

## ⚡ Quick Diagnostic Checks

### Is page loaded?
```
Check: current URL, page title, and take screenshot
```

### Is element present?
```
Get snapshot and search for element with test-subject "myElement"
```

### Is user logged in?
```
Check authentication status
```

### Are there errors?
```
Check for error toasts, get screenshot
```

### Is data loaded?
```
Navigate to Discover, check hit count, take screenshot
```

## 🔧 Interactive Debugging Session

### Template
```
Debug my failing test at [SPECIFIC STEP]:

1. Run test up to the failing step
2. Stop and take screenshot
3. Get page snapshot
4. Check current URL and auth status
5. Identify the issue
6. Suggest a fix
7. Test the fix
8. Verify it works
```

### Example
```
Debug my test that fails when adding a filter:

1. Navigate to Discover
2. Take screenshot
3. Try to add filter: field.keyword is "value"
4. Take screenshot after
5. Get snapshot of filter bar
6. Check if filter appears
7. If not, tell me why
```

## 📋 Create Debug Report

```
Create a full debug report:
1. Screenshot of current state
2. Page snapshot
3. Current URL and title
4. Auth status
5. Any error messages
6. List of all visible buttons
7. Browser console errors (if available)

Save all this so I can share with my team
```

## 💡 Pro Tips

1. **Screenshot first, investigate second** - Always capture visual state
2. **Use snapshots to find selectors** - Faster than inspecting manually
3. **Break tests into steps** - Debug one step at a time
4. **Compare before/after** - Screenshots reveal what changed
5. **Check timing** - Add waits to see if it's a race condition
6. **Verify assumptions** - Don't assume navigation or auth worked
7. **Test in isolation** - Remove complexity to isolate the issue
8. **Save artifacts** - Keep screenshots and logs for later reference

## 🎓 Learn from Failures

After debugging:
```
Based on this debug session, update my test to:
1. Add proper wait conditions
2. Use the correct selectors
3. Verify each step succeeds
4. Add meaningful error messages
```

## 🆘 When Stuck

```
I'm stuck debugging this test. Use Scout to:
1. Show me everything about the current state
2. Compare with what I expected to see
3. Suggest 3 possible causes for the failure
4. Help me test each possibility
```
