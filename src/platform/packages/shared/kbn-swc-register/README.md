# @kbn/swc-register

Dev-only require hook for loading Kibana Node.js modules with `@swc/core`.

The SQLite cache uses `data/swc_register_cache/<upstream-branch>/v3.sqlite`. Older checkouts may also have an LMDB cache at `data/swc_register_cache/<upstream-branch>/v2`. To reclaim that space, stop all Kibana and Node processes using the checkout, then delete only the `v2` directory. Do not delete it while an older process may still be using LMDB.
