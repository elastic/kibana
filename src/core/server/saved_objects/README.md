/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

Saved Objects Service
=========
Alternative to request scoped services https://github.com/elastic/kibana/pull/14980
(outdated) Saved object service https://github.com/elastic/kibana/pull/15739

For https://github.com/elastic/kibana/issues/18842

History:
---------
These were times we made an effort to create one set of abstractions for saved objects.
  - tribe node support
  - compatibility layer for Kibana 5.6 and 6+ to work with single and multiple type indices

Why now?
---------
 - New things need a standard set of abstractions for saved objects
   - Global extensions to SOS (Saved Objects Service):
     - [OLS](https://github.com/elastic/kibana/issues/18473): when Security is enabled all requests to saved objects need to be scoped to a user
     - Spaces: when Spaces are enabled all requests to saved objects need to be scoped by space
     - migrations
     - tags
   - Users of SOS that should be able to consume those global extensions:
     - logstash pipelines
     - canvas workpads
     - reporting jobs
 - Stop the abstractions leaking into the rest of Kibana
     - When we create tags/ols/etc, let's do it through the new abstractions
     - We solve the problem of new features not clobbering one another

OSS Kibana
---------
The saved objects service and all its exposed APIs exist in open source Kibana, but many X-Pack plugins may need a version of the saved objects client that does a little more. This means that the saved objects service needs to allow plugins to modify or create a new saved objects client that will then be used for all requests thereafter. In addition, just as with all OSS, the code which exists in OSS Kibana cannot assume or reference any X-Pack specific entities that may use it. So all this functionality has to be as generic as possible.

X-Pack Security
---------
When Security uses the `find` method in the current saved objects client, it filters the objects returned from Elasticsearch by what objects the user can access. Security can also access Elasticsearch data directly, authenticating as the end user, but for things unrelated to Kibana Saved Objects.

X-Pack Spaces
---------
[Spaces issue](https://github.com/elastic/x-pack-kibana/issues/774)

When Spaces are enabled, all requests have the new current space context, which is stored in the URL. Saved objects are claimed in some space, whether explicitly or via the default space. Thus the saved object client needs to somehow be aware that this new context is a factor in every request to saved objects.

Spaces need to interact with saved objects in the same way that OLS does, the main difference being that where OLS uses users and roles, Spaces use `space_id`.

From a saved object standpoint, Spaces will be represented as individual saved objects of type `space` and other saved objects, like `dashboard`s, `index_pattern`s, `visualization`s, and `saved_search`es, will have a `space_id` stored on them.

Saved Objects that don't have `space_id` are available in the default space, which is a virtual concept rather than a literal one, since there is no space object that represents the default space.

Spaces + Security
---------
Spaces is going to be available in X-Pack Basic, and therefore there needs to be an OSS version of the saved objects client that doesn't have anything to do with spaces or security; and when X-Pack is used, the saved objects client needs to be able to change.

With just Spaces enabled but Security disabled, the saved objects client needs to accept a new `space_id` context. This can be as simple as an optional parameter. It doesn't seem like a whole new saved object client needs to be created just to scope its requests to a Space.

With both Spaces and Security enabled, we'll need a saved object client that performs the extra authentication (`has privileges`) checks for all read/write access, but it cannot clobber the existing context that Spaces has required. Here, it does seem like a whole new saved object client _might_ be needed, or else some flexible way to extend some or all methods of the saved object client to perform the extra checks.

- [] X-Pack Migrations
- [] Tags

Kibana, Plugins, Saved Objects System startup
---------
We believe the system should start up similarly to a daemon, around when Kibana starts up. This way, we can identify problems sooner, at setup time rather than when we write saved objects. We can also startup the various clients (which would be the daemons) that listen for and handle reads and writes properly. The consumers of the Saved Objects Service also then don't have to care about storage location for saved objects. Their startup functions can handle that.

If the system starts up like a daemon, then there could be an initial saved object client that's created as an Observable. In OSS Kibana this client probably doesn't need to change for each request or when some plugins are enabled/disabled. However when certain X-Pack plugins are enabled, we do need to allow changes to be made to the client, via Spaces and Security. So that means the saved object system needs to allow plugins to instruct the system to create a saved object client for each request that specifically cares about the context of that request.

Storage - Logstash, Reporting, Beats
---------
**Note about Monitoring:** We can't handle monitoring data within the Saved Objects System. Elasticsearch has to own these.

If all that is done gracefully, then storage becomes an implementation detail. We don't need to limit ourselves to a single `.kibana` index. We have a system that migrates, applies OLS, has reliable abstractions for saved objects.

In X-Pack, we may also be able to leverage the upcoming life-cycle management feature provided by Elasticsearch to manage reporting indices. (More on this as details arrive.)

Index Life-cycle Management
---------

When you define a type through our saved object system, as part of that type configuration, you describe the storage behaviors for that type. Certain types, like reporting jobs (noisy) can be balanced across weekly indices, and less noisy dashboards can be dumped into the `.kibana` index, for example. The index where these things are stored are up to us.

If and when Elasticsearch life-cycle management arrives, we might offload the multi-index issue to Elasticsearch, and Saved Objects Service can simply not worry about that. It can simply use an alias per type or per app that is resolved on the Elasticsearch side. That storage strategy or location is then locked to the consumer specifying the behavior and type (in this case, the plugin).

The user can access their data, but all their admin data, for the sake of consuming Kibana features, is done through the Saved Object Service. A whole index needs to opt into being managed by Kibana; it cannot be some part of documents of an index. An index is either managed by Kibana or not. That index then gets OLS, migration support, tags, all the features that the Saved Object System can incorporate.

Some implementation questions
---------
### Performance
Is slowness an issue for migrating mappings for five years worth of reporting jobs?

Even if we did a fallback to a `_reindex` or some ES API, that should still be an implementation detail. User says "I want a performant migration" which means user isn't modifying the actual Kibana objects in ES, or touching any Kibana primitives. We'll doing that behind the scenes.

### X-Pack Indices
X-Pack-Elasticsearch manages monitoring, beats, logstash indices. So now these have to be managed by Kibana? Monitoring cannot fall under this model because monitoring indices need to be able to be created at any time, not just when Kibana can do it.

If Kibana manages an index, it also has to manage that index's creation.

### Current search/find in Saved Object Client
Search/find saved objects is very simple. The Saved Object Service could provide more capabilities to build a more interesting search query.

### Integration testing
This approach makes it really easy to test the clients exposed by the Saved Object System. Start up saved object service, take a client from it, do a bunch of integration testing on it without ever running other plugins or Kibana itself. This would be relatively low level integration testing: only testing the interface between that client and Elasticsearch. (We'd have other larger swaths of Kibana getting integration tested.)

### Security plugin + http service
Plugins can specify which other plugins and core Kibana services they need. Each of those needs (dependencies) has its own contract, its finite set of methods it exposes.

The Security Plugin could get information from any incoming request, i.e. the `space_id` from the url, and then provide a new saved object client that wraps/contains that information. That way the handler for the request, within a plugin or within Kibana core, has access to a saved object client that has all the information it needs to access saved objects according to the current Space.

Kibana core still needs to provide the http service containing the saved object client, but it needs to have a way to register a function that's invoked every time a request comes in. The Security Plugin can be the thing that hooks into the http service's saved object client, and add stuff like request headers (from which we get the current user) and space information.

Implementation Ideas
---------
Do the Migrations client and Saved Object client share important internal details? Can they be exposed by separate services?

The different things we want plugins to configure for saved objects:

**Migrations.** A plugin can specify Migrations as a dependency. It can call a method `migrationsClient.registerMigration()` or something, that takes in a name and an action to run, for example.

**Http service.** The Http Service could provide certain clients to every handler function, such as the Saved Object Service and Elasticsearch Service, and possibly also the Migration Client/Service. This has the benefit of making it hard for people (users, developers) to call the Saved Object and Elasticsearch services outside of the context of a request. It doesn't make sense to allow that.

### Context
It's clear to me that we need some kind of object that stores only the details from the current request that are relevant to accessing the Saved Objects System. In OSS Kibana, this is likely an empty object. When X-Pack is enabled, it will consist of at most (that I can think of right now) these items:
* request headers that contain the current user (for Security)
* request Url that contains the current space id (for Spaces)

We can use this context like so. Register an endpoint along with the handler for that endpoint. Define the handler to explicitly pass the context to the saved object client factory (contained within the saved object service). The handler then provides the saved object client scoped to the right context.

For example, define a plugin that has only dependencies on Kibana core, and no other plugin dependencies. (Very simplified code example)

```js
// baz/index.js
import { KibanaPluginConfig } from '@kbn/types';
import { registerEndpoints } from './register_endpoints';

export const plugin: KibanaPluginConfig<{}> = {
  plugin: kibana => {
    // Grab components you need from Kibana core
    const { http } = kibana;

    // Register a router upon which to attach handlers
    const router = http.createAndRegisterRouter('/api/baz');

    // Start defining handlers
    registerEndpoints(router);
  },
};

```

Registering an endpoint lets you define what to expect from the request, validating those parts of the request, and how to handle the request. The handler can define a Saved Object Client

```js
// baz/api.js
export function registerEndpoints(
  router: Router
) {
  router.get(
    {
      path: '/:type',
      validate: schema => ({
        ...
      }),
    },
    async (req, res, coreServices) => {
      // Only what's validated is offered on request object
      const { ... } = req;

      // Use some services provided
      const {
        esService: elasticsearch,
        soService: savedObjects,
      } = coreServices;

      // Use a Data Client scoped to a request, given its headers
      const esClient = await esService.getScopedDataClient(req.headers);

      // Use a Saved Object Client scoped to a context
      const soClient = await soService.getScopedClient({
        user:  getUser(req.headers),
        space: getSpace(req.url),
      });

      // Initialize a service that uses some clients
      const bazService = new BazService(esClient, soClient);

      ...

  );
}
```

To see an implementation of ElasticsearchService and the different ways we can provide Elasticsearch via an Admin or Data Client, peruse [this directory](https://github.com/elastic/kibana/tree/new-platform/platform/src/server/elasticsearch).

One way the Http Service can know what to provide in its `coreServices` collection in every handler, is by allowing entities (plugins, services) to register their services with the Http Service.

```js
// saved_objects/index.js
import { KibanaPluginConfig } from '@kbn/types';

export const plugin: KibanaPluginConfig<{}> = {
  plugin: kibana => {
    const { http } = kibana;

    http.registerService('savedObjects', {
      getClient: () => {
        // for OSS Kibana, without Security or Spaces
      },
      getScopedClient: (context) => {
        const { user, space } = context;
        ...
      }
    });
  },
};
```

```js
// elasticsearch/index.js
...
    http.registerService('elasticsearch', {
      getUnscopedClient: () => {
        // what is this for?
      },
      getScopedDataClient()
        // for most calls
        // uses request.headers.authorization
    });
```

Inside of the Security plugin we can replace the core services by registering new ones.

```js
// security/index.js
...
  // Elasticsearch already has a way to get a scoped data client,
  // so Security can just return that.
  http.registerService('elasticsearch', (request) => {
    return {
      getDataClient: elasticsearch.getScopedDataClient,
      //getAdminClient unchanged
    };
  });
```

Court's draft
---------
 - originally sketched around how OLS can use nested saved object references
   - formal notion of types
   - the store itself, not just .kibana
 - configure saved objects client
 - define ownership of SO types at plugin boundaries
 - define storage/mapping/settings by type (e.g. for reporting)
 - the above can be used for:
   - migrations
   - import/export

How would a tag plugin work? It could give me saved objects and invoke a function that lets me decorate saved objects with tags. We probably want to do validation, error if tags are already decorated. Then expose a generic tags API. Register a router on the http service, which is provided by Kibana core. The handler grabs the saved object client from Kibana core (probably), which is initialized with request headers and an elasticsearch service (exposed by Kibana core also). You then do a normal `find` operation on tag. Wire it up so that the `find` function knows the passed in type is tag.

**Security plugin.** Configure it with some complicated OLS metadata in `registerSavedObjectMetadata`. Start up security plugin. Wire into the core saved object service. Apply your extensions. `registerFindMiddleware` to inject Security specific hooks into the `find` method in the saved objects service. Like additional filters for every find, update, or create request. Doesn't have to be this implementation, but some way to hook into existing saved object methods and inject some extra stuff a plugin may need to do.

**Dashboards.** If you have no global concerns, but you have a subset of objects of a particular type that you care about, like dashboard plugin, you can specify a schema for the new type and tell the saved objects service about it. And that type will now be available. Dashboard type has dependency on visualization type, so you do `const visualizationtype = vizDep.getSavedObjectType()`, where `vizDep` is pulled out of dependencies. Need to be able to specify validation rules for the new type defined for a plugin.

A lot of features depend on how saved objects service is implemented, but OLS cannot be blocked on this.
Is there a way I could write a shell of Saved Objects Service that lets migrations be exposed before the core of saved objects system is written? I don't know. It will have dependencies on the internals.


Develop the core internal service and how it gets plugged. The migrations client just fits into that. What the migration client exposes is probably totally separate from what the core service needs to care about. But again, what it uses internally will matter in the design of both the core service and the migrations client.


OSS vs X-Pack
---------
There may be a set of extension points that only make sense for X-Pack, particularly Security, so some of this project could live in X-Pack. We don't want Dashboards to say, "oh, you have X-Pack installed, so add tags to dashboards." If that needs to happen, it should go through something that lives entirely within X-Pack.

Tagging
---------
Wait until the core service is done. So it's blocked on it. The discussion blew up around Tags and Security. Now Tags are "Security Groups." Better that it's on hold for the moment so when we dive back into tagging its scope will be clearer.

Nesting problem
---------
Dashboard shouldn't create a dependency between its dashboard object and visualize object. So we use DI to resolve that. The visualize plugin exposes on its contract the schemas that dashboards can use. It's possible the user could get all visualizations by going through a "dashboard" plugin, without specifying a dependency on the visualize plugin. It would be really nice to somehow prevent this. But at least in our implementation we should define the dependency so that it's not normally possible. What visualizations come back via the dashboard plugin should be from methods exposed by the visualize plugin.

