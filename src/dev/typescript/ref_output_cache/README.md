# `node scripts/build_ts_refs` output cache

This module implements the logic for caching the output of building the ts refs and extracting those caches into the source repo to speed up the execution of this script. We've implemented this as a stop-gap solution while we migrate to Bazel which will handle caching the types produced by the
scripts independently and speed things up incredibly, but in the meantime we need something to fix the 10 minute bootstrap times we're seeing.

How it works:

 1. traverse the TS projects referenced from `tsconfig.refs.json` and collect their `compilerOptions.outDir` setting.
 2. determine the `upstreamBranch` by reading the `branch` property out of `package.json`
 3. fetch the latest changes from `https://github.com/elastic/kibana.git` for that branch
 4. determine the merge base between `HEAD` and the latest ref from the `upstreamBranch`
 5. check in the `data/ts_refs_output_cache/archives` dir (where we keep the 10 most recent downloads) and at `https://ts-refs-cache.kibana.dev/{sha}.zip` for the cache of the merge base commit, and up to 5 commits before that in the log, stopping once we find one that is available locally or was downloaded.
 6. check for the `.ts-ref-cache-merge-base` file in each `outDir`, which records the `mergeBase` that was used to initialize that `outDir`, if the file exists and matches the `sha` that we plan to use for our cache then exclude that `outDir` from getting initialized with the cache data
 7. for each `outDir` that either hasn't been initialized with cache data or was initialized with cache data from another merge base, delete the `outDir` and replace it with the copy stored in the downloaded cache
     1. if there isn't a cached version of that `outDir` replace it with an empty directory
 8. write the current `mergeBase` to the `.ts-ref-cache-merge-base` file in each `outDir`
 9. run `tsc`, which will only build things which have changed since the cache was created