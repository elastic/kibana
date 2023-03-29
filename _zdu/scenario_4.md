Scenario 4: new field in rule SO not part of AAD
========================================================================

We've moved a field which was considered AAD, to one that is - `name` -
[`server/saved_objects/index.ts`](../x-pack/plugins/alerting/server/saved_objects/index.ts). 

See scenario_3 for rationale on why it was done this way.

We'll create an index threshold rule, and try to observe both Kibanas
executing it.  The new Kibana has an instrumented the executor -
[`stack_alerts/server/rule_types/index_threshold/rule_type.ts`](../x-pack/plugins/stack_alerts/server/rule_types/index_threshold/rule_type.ts).
And you can look at the Rule details page / Log, to ensure that it's
running.  To make sure both Kibanas are running the rule, kill the new
one so that only the old one is running, and observe from the details
logs that the old Kibana must be running it as well.

directions
------------------------------------------------------------------------

start old ES / main:

```console
$ yarn es snapshot --license trial
```

start old Kibana / main:

```console
$ yarn start --no-base-path --run-examples
```

start new Kibana - on port 15601 / this branch:

```console
$ yarn start --no-base-path --run-examples --port 15601
```

run the script to create the rule let it run / this branch:

```console
$ _zdu/scenario_4.mjs
```

outcome
------------------------------------------------------------------------

The old Kibana fails when attempting to execute the rule, with the
following error:

    Failed to decrypt "apiKey" attribute: Unsupported state or unable to authenticate data

Just as Mike has forseen, in 
the [GOOG doc](https://docs.google.com/document/d/1TUgGbM44nW90YyASAEE_rXQ16x21eKoKyYcEtgogAj4/edit?usp=sharing).


changes required
------------------------------------------------------------------------

Not clear to me what we can do here, as I don't really understand why
this one fails, but scenario 3 passes.


et cetera
------------------------------------------------------------------------

