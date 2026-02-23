# Testing Guide: ES|QL Feedback Link Removal

## Summary of Changes

**Branch:** `remove-esql-feedback-link`

**File Modified:** 
- `src/platform/plugins/shared/discover/public/application/main/components/top_nav/esql_dataview_transition/esql_dataview_transition_modal.tsx`

**Changes:**
- Removed "Submit ES|QL feedback" link from the modal that appears when switching from ES|QL to classic mode
- Cleaned up unused imports: `FEEDBACK_LINK`, `EuiLink`, `useDiscoverServices`
- Removed `isFeedbackEnabled` variable and related logic

## Local Testing Setup

### 1. Start Elasticsearch

You'll need a local Elasticsearch instance running. You can use either:

**Option A: Start with yarn (recommended for development)**
```bash
cd /Users/ninoslavmiskovic/Documents/GitHub/kibana-universal-logs
yarn es snapshot
```

**Option B: Use Docker**
```bash
docker run -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" -e "xpack.security.enabled=false" docker.elastic.co/elasticsearch/elasticsearch:8.17.0
```

### 2. Start Kibana

In a separate terminal:

```bash
cd /Users/ninoslavmiskovic/Documents/GitHub/kibana-universal-logs
yarn start
```

This will:
- Build Kibana (first time may take 10-15 minutes)
- Start the dev server
- Open Kibana at `http://localhost:5601`

**Note:** If you get dependency errors, run `yarn kbn bootstrap` first.

### 3. Test the Feature

Once Kibana is running:

1. **Navigate to Discover**
   - Go to `http://localhost:5601/app/discover`

2. **Switch to ES|QL Mode**
   - Click the ES|QL tab or button in Discover
   - Write any ES|QL query (e.g., `FROM logs-* | LIMIT 10`)
   - If you don't have data, you can add sample data from Home → "Try sample data"

3. **Trigger the Modal**
   - Click "Switch to classic" from the tab menu (should be in the top navigation area)
   - This will trigger the "Unsaved changes" modal

4. **Verify the Change**
   ✅ **Expected:** The modal should appear with:
   - Title: "Unsaved changes"
   - Body text about switching data views
   - Buttons: "Discard and switch" and "Save and switch"
   - Checkbox: "Don't ask me again"
   - **NO "Submit ES|QL feedback" link** (this is what we removed!)

   ❌ **Before the change:** There would be a "Submit ES|QL feedback" link in the bottom right of the modal body

5. **Test Modal Functionality**
   - Verify both buttons work correctly
   - Verify the "Don't ask me again" checkbox works
   - Verify the modal closes properly

## Quick Start Commands

```bash
# Terminal 1: Start Elasticsearch
cd /Users/ninoslavmiskovic/Documents/GitHub/kibana-universal-logs
yarn es snapshot

# Terminal 2: Start Kibana  
cd /Users/ninoslavmiskovic/Documents/GitHub/kibana-universal-logs
yarn start

# Then open: http://localhost:5601/app/discover
```

## Troubleshooting

### Port Already in Use
If port 5601 is already in use:
```bash
lsof -ti:5601 | xargs kill -9
```

### Node Version Issues
Kibana requires Node.js v20. Check your version:
```bash
node --version
```

If needed, use nvm:
```bash
nvm use 20
```

### Build Errors
If you encounter build errors:
```bash
yarn kbn clean
yarn kbn bootstrap
```

## Visual Comparison

### Before (with feedback link):
```
┌─────────────────────────────────────────┐
│ Unsaved changes                         │
├─────────────────────────────────────────┤
│ Switching data views removes the        │
│ current ES|QL query...                  │
│                                          │
│                   Submit ES|QL feedback → (REMOVED)
│ ─────────────────────────────────────── │
│ ☐ Don't ask me again                    │
│           [Discard] [Save and switch]   │
└─────────────────────────────────────────┘
```

### After (feedback link removed):
```
┌─────────────────────────────────────────┐
│ Unsaved changes                         │
├─────────────────────────────────────────┤
│ Switching data views removes the        │
│ current ES|QL query...                  │
│                                          │
│ ─────────────────────────────────────── │
│ ☐ Don't ask me again                    │
│           [Discard] [Save and switch]   │
└─────────────────────────────────────────┘
```

## Next Steps

Once you've verified the changes work correctly:

1. **Stage and commit the changes:**
   ```bash
   git add src/platform/plugins/shared/discover/public/application/main/components/top_nav/esql_dataview_transition/esql_dataview_transition_modal.tsx
   git commit -m "[Discover] Remove ES|QL feedback link from data view transition modal"
   ```

2. **Push the branch:**
   ```bash
   git push -u origin remove-esql-feedback-link
   ```

3. **Create a Pull Request:**
   - Go to https://github.com/elastic/kibana/pulls
   - Create PR from `remove-esql-feedback-link` to `main`
   - Add description explaining the removal
   - Tag relevant reviewers

## Code Changes Summary

**Lines removed:** 16 lines total
- Removed `FEEDBACK_LINK` import
- Removed `EuiLink` from imports  
- Removed `useDiscoverServices` import
- Removed `isFeedbackEnabled` variable
- Removed entire feedback link JSX block

**Result:** Clean, minimal change with no functional impact except removing the feedback link.
