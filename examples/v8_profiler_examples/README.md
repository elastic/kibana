# V8 profiler examples

Provides access to the V8 CPU Profiler and Heap Profiler, to inspect
the Kibana running this plugin.

The endpoints are:

    /_dev/cpu_profile?duration=(seconds)&interval=(microseconds)
    /_dev/heap_profile?duration=(seconds)&interval=(bytes)

The default duration is 5 seconds.

For more information on these V8 APIs, see:

- https://chromedevtools.github.io/devtools-protocol/v8/Profiler/
- https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/

Try them right now, assuming you started Kibana with `--run-examples`!

- [`http://localhost:5601/_dev/cpu_profile`](http://localhost:5601/_dev/cpu_profile)
- [`http://localhost:5601/_dev/heap_profile`](http://localhost:5601/_dev/heap_profile)
  

When using curl, you can use the `-kOJ` options, which:

- `-k --insecure`: allow HTTPS usage with self-signed certs
- `-O --remote-name`: use the server-specified name for this download
- `-J --remote-header-name`: use the `Content-Disposition` as the name of
  the download

So one of the following should work for you, to run a 5 second CPU profile
using an interval of 100μs (default: 10s / 1000μs):

```
curl -OJ "http://elastic:changeme@localhost:5601/_dev/cpu_profile?duration=5&interval=100"
curl -kOJ "https://elastic:changeme@localhost:5601/_dev/cpu_profile?duration=5&interval=100"
```

The files generated will be:

    MM-DD_hh-mm-ss.cpuprofile
    MM-DD_hh-mm-ss.heapprofile

These filetypes are the ones expected by various V8 tools that can read these.

You can use these URLs in your browser, and the files will be saved with the
generated names.

## profile / heap profile readers

The traditional tools used to view these are part of Chrome Dev Tools (CDT).  

For CPU profiles, open Chrome Dev Tools and then click on the "Performance" menu.
You should be able to drop a file right from Finder / Explorer onto the CDT window,
and then get the visualization of the profile.  If you downloaded the profile right
from the browser, using the URL in the URL bar, you can drop the download file from
the download status button right into CDT.

For CPU profiles, there are other options.

VSCode now supports `.cpuprofile` files directly, displaying them as a table of
function timings.  There is also an extension available to display flame charts,
installed by clicking on the grey-ed out "flame" button on the top-right of the
cpu profile view. _Note: after playing around with this for quite some time -
it's nice, but there are UI bugs, and some of the numbers aren't quite right.
Compared to the other profiler readers mentioned here, which showed the same
numbers for top entries._

An alternate view of CPU profiles, which organizes files based on "packages",
is available with the **NO**de **PRO**filer (`no-pro`) thing available 
at https://pmuellr.github.io/no-pro/ .  It also supports
drag-n-drop of CPU profile files.  Note that you can get more directories to
show up as "packages", by bringing up CDT and running the following code:

    localStorage['fake-packages-dirs'] = "x-pack/plugins,packages,src/core"

## tips / tricks

If you're handy with Mac Finder, or other ways of auto-launching apps
based on file extensions, it's easy to associate `.cpuprofile` files
with vscode.  

Since the http endpoints are GET requests, they are easy to bookmark.  Start
a profile by clicking on a bookmark.

When these files are downloaded via Chrome, you can typically launch
them directly from the download bar, or drag the file to a viewer.
