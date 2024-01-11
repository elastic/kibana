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

Note that due to bugs or limitations,
it's not possible to generate heap snapshots using the techniques used
to generate the cpu and heap profiles.

Try them right now, assuming you started Kibana with `--run-examples`!

- [`http://localhost:5601/_dev/cpu_profile`](http://localhost:5601/_dev/cpu_profile)
- [`http://localhost:5601/_dev/heap_profile`](http://localhost:5601/_dev/heap_profile)
  

When using curl, you can use the `-kOJ` options, which:

- `-k --insecure`: allow HTTPS usage with self-signed certs
- `-O --remote-name`: use the server-specified name for this download
- `-J --remote-header-name`: use the `Content-Disposition` as the name of
  the download

So one of the following should work for you, to run a 10 second CPU profile
using an interval of 100μs (default: 5s / 1000μs):

```
curl -OJ "http://elastic:changeme@localhost:5601/_dev/cpu_profile?duration=10&interval=100"
curl -kOJ "https://elastic:changeme@localhost:5601/_dev/cpu_profile?duration=10&interval=100"
```

The files generated will be:

    MM-DD_hh-mm-ss.cpuprofile
    MM-DD_hh-mm-ss.heapprofile

These filetypes are the ones expected by various V8 tools that can read these.

You can use these URLs in your browser, and the files will be saved with the
generated names.

## profile / heap profile readers

The traditional tools used to view these are part of Chrome Dev Tools (CDT)
and now VS Code also supports viewing these files.  They provide
similar capabilities.

There doesn't seem to be a much doc available on how to use the viewers
for these files.  The Chrome Dev Tools docs are extremely old and appear
to be out-of-date with the current user interface. The VS Code
documentation [Analyzing a profile][] is more recent, but there's not
much there.

[Analyzing a profile]: https://code.visualstudio.com/docs/nodejs/profiling#_analyzing-a-profile

For CPU profiles, open CDT and then click on the "Performance" tab. You
should be able to drop a file right from Finder / Explorer onto the CDT
window, and then get the visualization of the profile.  If you
downloaded the profile right from the browser, using the URL in the URL
bar, you can drop the download file from the download status button
right into CDT.

For heap profiles, open CDT and then click on the "Memory" tab. Drag and
drop doesn't seem to work here, but you can load a file via a file
prompter by clicking the "Load" button at the bottom of the "Memory"
pane. You will probably need to scroll to see the button.

VSCode now supports `.cpuprofile` files and `.heapprofile` files
directly, displaying them as a table of function timings.  There is also
[an extension available to display flame charts][] installed by clicking
on the grey-ed out "flame" button on the top-right of the cpu profile
view. 

[an extension available to display flame charts]: https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-js-profile-flame

There seem to be problems with both CDT and the VS Code tools, at times.
The flame charts in VS Code seem to go haywire sometimes. The heap
profile tables in CDT don't expand.  Etc. So, beware, and be prepared to
have to use multiple tools to analyze these files.

An alternate view of CPU profiles, which organizes files based on
"packages", is available with the **NO**de **PRO**filer (`no-pro`) thing
available at https://pmuellr.github.io/no-pro/ .  It also supports
drag-n-drop of CPU profile files.  Note that you can get more
directories to show up as "packages", by bringing up CDT and running the
following code:

    localStorage['fake-packages-dirs'] = "x-pack/plugins,packages,src/core"


## tips / tricks

If you're handy with Mac Finder, or other ways of auto-launching apps
based on file extensions, it's easy to associate `.cpuprofile` files
with vscode.  

Since the http endpoints are GET requests, they are easy to bookmark.
Start a profile by clicking on a bookmark.

When these files are downloaded via Chrome, you can typically launch
them directly from the download bar, or drag the file to a viewer.
