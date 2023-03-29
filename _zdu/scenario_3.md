Scenario 3: new field in rule SO part of AAD
========================================================================

We've moved a field which was not considered AAD, to one that is - `muteAll` -
[`server/saved_objects/index.ts`](../x-pack/plugins/alerting/server/saved_objects/index.ts). 

My first attempt was to add a brand new top-level rule SO property, but
ES failed when indexing the doc because of the mapping violation (field
not in mapping).  I don't want to change the mappingss though, as this
would likely involve a migration, which would then be testing _other_
things I don't want to test right now.

So I figured moving an existing field not in AAD, to AAD, would be good 
enough.  The field in question should not be updated during the tests.
So, in this case, we should NOT call the mute_all endpoint as it would
update this field but not re-encrypt the SO (I think).

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
$ _zdu/scenario_3.mjs
```

outcome
------------------------------------------------------------------------

It works!  I don't understand why, but Mike does claim that he expects
this to work in the [GOOG doc](https://docs.google.com/document/d/1TUgGbM44nW90YyASAEE_rXQ16x21eKoKyYcEtgogAj4/edit?usp=sharing).

The reason I don't think it should work is that when the API key in the
rule is encrypted, it will use the AAD field values as additional key
material.  This is to prevent someone "tampering" with sensitive data -
for instance changing the rule thresholds by directly updating the
SO document in ES.  If this happens, then the encrypted API key won't
be able to be decrypted since the rule threshold changed, and the rule
should hit an error during execution.

So, seems to me like old Kibana should not have been able to decode 
the API key.  It didn't know about the new AAD key, so wouldn't
have used it as key material on decryption.  

I'm guessing I'm misunderstanding how encrypted saved objects work,
in this regard.


changes required
------------------------------------------------------------------------

None!

et cetera
------------------------------------------------------------------------

