- `bunyan` (without redir) ^C should stop, doesn't since recent change
- man page for the bunyan CLI (refer to it in the readme)
- `tail -f`-like support
- 2.0 (?) with `v: 1` in log records. Fwd/bwd compat in `bunyan` CLI

# docs

- document log.addStream() and log.addSerializers()


# someday/maybe

- full-on docs
- better examples/
- better coloring
- would be exciting to have bunyan support in http://lnav.org/ if that
  made sense
- "template" support for 'rotating-file' stream to get dated rolled files
- "all" or "off" levels? log4j? logging.py?
  logging.py has NOTSET === 0. I think that is only needed/used for
  multi-level hierarchical effective level.
- buffered writes to increase speed:
    - I'd start with a tools/timeoutput.js for some numbers to compare
      before/after. Sustained high output to a file.
    - perhaps this would be a "buffered: true" option on the stream object
    - then wrap the "stream" with a local class that handles the buffering
    - to finish this, need the 'log.close' and `process.on('exit', ...)`
      work that Trent has started.
- "canWrite" handling for full streams. Need to buffer a la log4js
- test file log with logadm rotation: does it handle that?
- test suite:
    - test for a cloned logger double-`stream.end()` causing problems.
      Perhaps the "closeOnExit" for existing streams should be false for
      clones.
    - test that a `log.clone(...)` adding a new field matching a serializer
      works *and* that an existing field in the parent is not *re-serialized*.
- split out `bunyan` cli to a "bunyan" or "bunyan-reader" or "node-bunyan-reader"
  as the basis for tools to consume bunyan logs. It can grow indep of node-bunyan
  for generating the logs.
  It would take a Bunyan log record object and be expected to emit it.

        node-bunyan-reader
            .createReadStream(path, [options]) ?

- coloring bug: in less the indented extra info lines only have the first
  line colored. Do we need the ANSI char on *each* line? That'll be
  slower.
- document "well-known" keys from bunyan CLI p.o.v.. Add "client_req".
- More `bunyan` output formats and filtering features.
- Think about a bunyan dashboard that supports organizing and viewing logs
  from multiple hosts and services.
- doc the restify RequestCaptureStream usage of RingBuffer. Great example.
- A vim plugin (a la http://vim.cybermirror.org/runtime/autoload/zip.vim ?) to
  allow browsing (read-only) a bunyan log in rendered form.
- Some speed comparisons with others to get a feel for Bunyan's speed.
- what about promoting 'latency' field and making that easier?
- `log.close` to close streams and shutdown and `this.closed`
  process.on('exit', log.close)
  -> 'end' for the name
- bunyan cli: more layouts (http://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/EnhancedPatternLayout.html)
  Custom log formats (in config file? in '-f' arg) using printf or hogan.js
  or whatever. Dap wants field width control for lining up. Hogan.js is
  probably overkill for this.
- loggly example using raw streams, hook.io?, whatever.
- serializer support:
    - restify-server.js example -> restifyReq ? or have `req` detect that.
      That is nicer for the "use all standard ones". *Does* restify req
      have anything special?
    - differential HTTP *client* req/res with *server* req/res.
- statsd stream? http://codeascraft.etsy.com/2011/02/15/measure-anything-measure-everything/
  Think about it.
- web ui. Ideas: http://googlecloudplatform.blogspot.ca/2014/04/a-new-logs-viewer-for-google-cloud.html
