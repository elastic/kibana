# OnWeek 2023-05 - Optimize startup of Kibana’s using only role background_tasks

- Patrick Mueller
- [[on-week] optimize startup of Kibana when only using role background_tasks #157049](https://github.com/elastic/kibana/pull/157049)

We’d like to see if we can optimize starting Kibana when it is only
using the background_tasks role, and not the ui role.

## starting Kibana with `background_tasks` only role

To make this happen in a development environment, you should first
start elasticsearch like usual:

```console
yarn es snapshot --license trial
```

Then start Kibana with both roles; we need to do this to get the initial
migration to run, which won't happen in a background-task-only Kibana:

```console
yarn start --no-base-path
```

After Kibana starts up, you can kill it, and then re-launch Kibana with 
background tasks only:

```console
yarn start --no-base-path '--node.roles=["background_tasks"]'
```

_Note, I'm willing to live with a dev environment here, despite it no
doubt being "slower" than running the final product._

## what to optimize???

First attempt at figuring out WHAT to optimize, will be taking a CPU
profile from startup - hopefully this will be useful.  To get that I’ve
added some code to src/cli/cli.js to start a CPU profile.

So now, when you launch Kibana with `yarn start`, you'll end up with
two profiles, a few seconds apart.  One is the dev "watcher" process -
it's time is earlier than the "real" one, which is later.  Always use
the slightly older profile.

I took a couple of profiles, they seemed to be fairly consistent on
my 2021 MacBook Pro / Apple M1 Max / 32 GB ram.  Total of ~13 seconds
to start.

| milliseconds | task | 
| ----:        | ---- |
| 8000         | loading modules via `handleDiscoveredPlugins()`
|  150         | running `preboot`
| 1800         | running `setup`
| 2000         | running migration
| 1000         | running `start`

There's a fair amount of non-functional overhead here: 8s to load
modules, 2s to wait for a migration that isn't needed.

Even if we could trim down `setup` and `start`, there's not going to
be much savings.

Trimming back code seems like the best bang for the buck, but also hard.

## load less code; don't load plugins that aren't needed

So, what if we could arrange to not load code that we don't need.  Two
things:

- how would we figure out what we need / don't need
- how would we prevent the code from being loaded

For the first point, I wrote some code to dump the plugins loaded
at Kibana startup, along with their required and optional dependencies.
I then wrote some CLI tools to analyze that output.  The plugins we want:

- ultimately depends on task manager OR
- are required by a plugin which ultimately depends on task manager

Not the simplest thing to compute :-).

Basic algorithm is `getBackgroundlugins()` in `get_background_tasks.js`:

- find all plugins ultimately dependent on taskManager
- find all the required plugins of those plugins

This resulted in 83 of 172 plugins being marked as "background task only"

For the second point - how would we prevent the code from being loaded -
there are some points in the plugin service that will bypass loading
plugins, if they aren't enabled, if pre-reqs aren't available, etc.  So
that's how we could arrange to **NOT** load some plugins.  Modules and
"packages" are another story though.  
Hopefully starting with the "roots" that we need (only plugins that we
want to load), only the modules and "packages" we'd need would also
be loaded.

This could potentially save some time in the setup / start phases,
but that's only 2 seconds out of the 13, so not going to be much bang
for the buck in that approach.  Still, if we want to shave every,
millisecond off, we'll want to do that.

I generated some graphs of the dependencies:

## load **much** less code, quicker


