# How to test print-optimized reports

To see the page-optimized dashboard use the browser's built-in print preview.

**Note**: It is recommended to use Chrome or Chromium since that will use the same
implementation as the Screenshotting plugin.

1. Ensure the dashboard is rendering in "print" mode: add `&_a=(viewMode:PRINT)`
   to the end of the dashboard URL.
   **Note**: You will need to clear your session storage to get out of print view.
3. Refresh the dashboard you are viewing and you should see a different layout.
4. Press ctrl/cmd+P to get a print preview.

From this point you can make a change to the code, refresh the page and press
ctrl/cmd+P to see the printed dashboard.

**Note**: Title, branding and page numbers are injected when printing the
dashboard via the server, see [the original PR](https://github.com/elastic/kibana/pull/130546)
for more details on this.

# Additional notes

* In future we should investigate not needing to rely on the print view
  page when generating screenshots and pressing ctrl/cmd+P should get us the print
  layout directly.
