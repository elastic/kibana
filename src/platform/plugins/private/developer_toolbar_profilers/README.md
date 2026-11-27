# developerToolbarProfilers

Development-only [developer toolbar](../../shared/developer_toolbar/README.md) buttons to capture
CPU and memory sampling profiles of the Kibana server's Node.js process, via `node:inspector`.
Click **CPU profile** or **Memory profile** to start a profile; the button turns into a stop
button, which stops the profile and downloads it. The plugin is excluded from distributables
(`devOnly`) and only registers its toolbar items and routes when Kibana runs in dev mode.

Files are named `kibana-<cpu|memory>-profile-<YYYY-MM-DD>_<HH-MM>.<cpuprofile|heapprofile>`,
using the time the profile was started.

Open the saved `.cpuprofile` / `.heapprofile` files in Chrome DevTools; for Node.js, open
`chrome://inspect` and click **Open dedicated DevTools for Node**.  

You can also associate `.cpuprofile` and `.heapprofile` files with VS Code on Mac, in Finder.
When doing that, selecting the file from the Download list in Chrome will open the profile up
immediately.

Note that running multiple profiles of the same type at the same time will likely 
not work the way you want.  Only run one profile of each type at a time.

## Routes

All routes are under `/internal/developer_toolbar_profilers` and require the `superuser` role.
Only one profile of each type can run at a time; requests that conflict with that return `409`.

| Route | Description |
| --- | --- |
| `GET /cpu_profile?duration=<seconds>` | Runs a CPU profile for `duration` seconds (default 5, 1-300) and downloads it. |
| `GET /memory_profile?duration=<seconds>` | Runs a memory profile for `duration` seconds (default 5, 1-300) and downloads it. |
| `POST /cpu_profile/start`, `POST /memory_profile/start` | Starts a profile. |
| `POST /cpu_profile/stop`, `POST /memory_profile/stop` | Stops a profile and downloads it. |
| `GET /status` | Reports which profiles are running. |

The `GET` profile routes have public access so they can be opened, or bookmarked, directly in
the browser, e.g. `http://localhost:5601/internal/developer_toolbar_profilers/cpu_profile?duration=10`.

In dev mode, requests usually go through the base path proxy, which drops proxied requests after
3 minutes. So a capture longer than about 180 seconds can still fail there unless Kibana runs
with `--no-base-path`.
