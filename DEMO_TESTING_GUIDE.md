# Alert Investigation Pipeline - Demo Testing Guide

**⏱️ Total Time: ~15 minutes**

---

## Pre-Flight Check

### 1. Identify Your Kibana URL

Your worktree appears to be using basePath `/vom`. Check which URL works:

```bash
# Check running Kibana instances
ps aux | grep kibana | grep -E "port=560[0-9]"

# Test URLs (open in browser):
# Option A: http://localhost:5601/vom
# Option B: http://localhost:5603/vom
# Option C: http://localhost:5601
```

**Find the URL that shows the Kibana home page, then use that base URL below.**

---

## 🖼️ Screenshot Capture (15 min)

### Setup

1. Open Chrome DevTools (F12 or Cmd+Opt+I)
2. Keep Console tab open to monitor errors
3. Set browser window to **1920x1080** for consistent screenshots

### Screenshot 1: Navigation (01_navigation.png)

**Steps:**
1. Navigate to: `{YOUR_KIBANA_URL}/app/home`
2. Wait for page to load fully
3. Click hamburger menu (☰) on the left
4. Scroll to **"Security"** section
5. Look for **"Alert Investigation Pipeline (Spike)"**
6. **Take screenshot showing nav menu with the pipeline entry**

**Save as:** `docs/screenshots/01_navigation.png`

**If not visible:** The app registration may not have loaded yet. Try:
- Refresh Kibana
- Check browser console for errors
- Verify TypeScript compiled: `yarn test:type_check --project x-pack/solutions/security/plugins/elastic_assistant/tsconfig.json`

---

### Screenshot 2: Dashboard - Healthy State (02_dashboard_healthy.png)

**Steps:**
1. Click "Alert Investigation Pipeline (Spike)" in nav **OR** navigate to:
   ```
   {YOUR_KIBANA_URL}/app/alert-investigation-pipeline
   ```

2. Wait for dashboard to load (watch network tab for API calls)

3. **Verify these elements are visible:**
   - ✅ Title: "Alert Investigation Pipeline"
   - ✅ Health status badge (HEALTHY / DEGRADED / UNHEALTHY)
   - ✅ Refresh button
   - ✅ Metrics panels:
     - Total Runs
     - Success Rate
     - Avg Duration
     - Consecutive Failures
   - ✅ Secondary metrics:
     - Alerts Processed
     - Cases Matched
     - Cases Created
     - Alerts Attached
     - AD Triggered
   - ✅ "Last run:" timestamp

4. **Take full-page screenshot**

**Save as:** `docs/screenshots/02_dashboard_healthy.png`

**If "Not Found" error:**
- Check console for TypeScript/load errors
- Verify plugin.tsx changes compiled
- Try hard refresh (Cmd+Shift+R)

---

### Screenshot 3: Metrics Overview (03_metrics_overview.png)

**Steps:**
1. On the same dashboard page
2. Click **"Refresh"** button
3. Watch for:
   - Button shows loading state (spinner/disabled)
   - Metrics update
   - No console errors
4. **Take screenshot focused on metrics section**

**Save as:** `docs/screenshots/03_metrics_overview.png`

---

### Screenshot 4: Error State (04_error_state.png)

**Steps:**
1. Open DevTools → **Network** tab
2. Find request to: `/internal/elastic_assistant/attack_discovery/pipeline/_health`
3. Right-click → **Block request URL**
4. Also block: `/internal/elastic_assistant/attack_discovery/pipeline/_metrics`
5. Click **Refresh** button on dashboard
6. **Verify error callout displays:** "Error fetching pipeline data"
7. **Take screenshot showing error state**

**Save as:** `docs/screenshots/04_error_state.png`

8. **Unblock URLs** (right-click → Unblock) after screenshot

---

### Screenshot 5: Settings Panel (05_settings_panel.png) [OPTIONAL]

**Steps:**
1. If there's a "Settings" tab/button visible, click it
2. **Take screenshot of configuration UI**

**Save as:** `docs/screenshots/05_settings_panel.png`

**If no settings UI:** Skip this screenshot - it's optional.

---

## ✅ Console Error Check

### What to Check:

In Chrome DevTools → Console tab, verify:

- ❌ **No JavaScript errors** (red X icons)
  - Exception: ResizeObserver warnings (OK to ignore)
  - Exception: favicon 404 (OK to ignore)

- ❌ **No React warnings:**
  - "Cannot update unmounted component"
  - "Memory leak detected"
  - "Invalid prop type"

- ❌ **No unhandled promise rejections**

### If Errors Found:

1. **Take screenshot of console**
2. **Copy full error stack trace to text file**
3. **Save as:** `docs/console_errors.txt`

---

## 📋 Quick QA Checklist

While testing, verify:

- [ ] Dashboard loads in < 5 seconds
- [ ] Health status displays correctly
- [ ] All metrics render (even if values are 0)
- [ ] Refresh button works without console errors
- [ ] Error callout appears when API blocked
- [ ] Refresh button stays enabled in error state (allows retry)
- [ ] Layout doesn't break at 1024px width (resize browser to test)
- [ ] No horizontal scrollbars
- [ ] Tab key navigation works (focus indicators visible)

---

## 🚨 Troubleshooting

### Dashboard Shows "Not Found"

**Cause:** Application not registered or plugin didn't load.

**Fix:**
```bash
# 1. Verify TypeScript compiled
yarn test:type_check --project x-pack/solutions/security/plugins/elastic_assistant/tsconfig.json

# 2. Check for plugin load errors in Kibana logs
tail -100 /tmp/kibana_start.log | grep -i "elastic_assistant"

# 3. Hard refresh browser (Cmd+Shift+R)

# 4. Restart Kibana if needed
pkill -f "kibana --dev"
yarn start
```

### Health/Metrics Don't Load

**Cause:** API routes not registered or Elasticsearch not connected.

**Fix:**
```bash
# Check API routes are registered
curl -I http://localhost:5601/vom/internal/elastic_assistant/attack_discovery/pipeline/_health

# Expected: HTTP 200 or 401 (auth required)
# NOT: 404 (routes not registered)
```

### Console Errors About Missing Dependencies

**Cause:** npm modules not installed.

**Fix:**
```bash
yarn kbn bootstrap
```

---

## 📊 After Screenshot Capture

### Verify All Screenshots Exist:

```bash
ls -lh docs/screenshots/
# Should show:
# 01_navigation.png
# 02_dashboard_healthy.png
# 03_metrics_overview.png
# 04_error_state.png
# (05_settings_panel.png - optional)
```

### Add to Git:

```bash
git add docs/screenshots/
git add docs/alert_investigation_pipeline_spike.md
git add docs/QA_CHECKLIST.md
git commit -m "Add pipeline dashboard screenshots and documentation"
```

---

## 🎤 Demo Dry Run (5 min)

Practice your 5-minute demo walkthrough:

1. **Show nav integration** (30 sec)
   - "Here's the new pipeline dashboard in the Security nav..."

2. **Demo health monitoring** (1 min)
   - Point out status badge colors
   - "Green = healthy, yellow = degraded, red = unhealthy"

3. **Explain metrics** (1.5 min)
   - Walk through each metric panel
   - "237 alerts processed, 93% success rate..."

4. **Architecture overview** (1 min)
   - Refer to ASCII diagram in README
   - "6 stages from fetch to incremental AD..."

5. **Error handling** (1 min)
   - Show error state screenshot
   - "Graceful degradation with retry capability"

**Full demo script:** See `docs/alert_investigation_pipeline_spike.md` → Demo Script section

---

## ✅ Ready for Demo

Once you have:
- [ ] 4-5 screenshots in `docs/screenshots/`
- [ ] No critical console errors
- [ ] Dashboard loads and displays correctly
- [ ] Practiced 5-minute walkthrough

**You're demo-ready!** 🚀

---

## 📝 Post-Demo Next Steps

1. **Push changes:**
   ```bash
   git add .
   git commit -m "Complete pipeline dashboard UI integration + docs"
   git push
   ```

2. **Run CI:**
   - Comment `/ci` on PR to trigger Buildkite

3. **Update PR description:**
   - Add screenshots
   - Link to spike doc: `docs/alert_investigation_pipeline_spike.md`

4. **Share with stakeholders:**
   - Screenshots
   - Demo video (optional)
   - Link to spike doc for technical details

---

## 🆘 Need Help?

**Quick diagnostics:**

```bash
# 1. Check Kibana is running
ps aux | grep kibana | grep -v grep

# 2. Check which port/basePath
ps aux | grep kibana | grep -E "port=|basePath="

# 3. Test API routes
curl http://localhost:5601/vom/internal/elastic_assistant/attack_discovery/pipeline/_health

# 4. Check console for errors (open DevTools → Console in browser)
```

**If stuck:** Review the comprehensive troubleshooting in `docs/alert_investigation_pipeline_spike.md`
