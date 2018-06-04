Saved Objects Service
=========
Alternative to request scoped services https://github.com/elastic/kibana/pull/14980
Saved object service https://github.com/elastic/kibana/pull/15739

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

Security
---------
When the Security Plugin needs to access or make changes to saved objects, it should always use the Saved Object Service or its clients. People (users, developers) can elect to bypass the service, but if they do, they are no longer involving Security in their access or changes to saved objects. This means they could have access in unintended ways unless they have their own method of resolving permissions.

When Security uses the `find` method in the current saved objects client, it filters the objects returned from Elasticsearch by what objects the user can access. Security can also access Elasticsearch data directly, authenticating as the end user, but for things unrelated to Kibana Saved Objects.

Spaces
---------
[Spaces issue](https://github.com/elastic/x-pack-kibana/issues/774)

When Spaces are enabled, all requests have the new current space context. Saved objects are claimed in some space, whether explicitly or via the default space. Thus, the saved object client needs to somehow be aware that this new context is a factor in every request to saved objects.

Spaces need to interact with saved objects in the same way that OLS does, the main difference being that Spaces use `space_id`.

From a saved object standpoint, Spaces will be represented as individual saved objects of type `space` and other saved objects, like dashboards, index_patterns, visualizations, and saved_searches, will have a `space_id` stored on them.

Saved Objects that don't have `space_id` are available in the default space, which is a virtual concept rather than a literal one, since there is no space that represents the default space.

Spaces + Security
---------
Spaces is going to be available in X-Pack Basic, and therefore there needs to be an OSS version of the saved objects client that doesn't have anything to do with spaces or security; and when X-Pack is used, the saved objects client needs to be able to change.

With just Spaces enabled but Security disabled, the saved objects client needs to accept a new `space_id` context. This can be as simple as an optional parameter. It doesn't seem like a whole new saved object client needs to be created just to scope its requests to a Space.

With both Spaces and Security enabled, we'll need a saved object client that performs the extra authentication (`has privileges`) checks for all read/write access, but it cannot clobber the existing context that Spaces has required. Here, it does seem like a whole new saved object client _might_ be needed, or else some flexible way to extend some or all methods of the saved object client to perform the extra checks.

Migrations
---------
The Migrations client needs to be able to work across the complete life cycle of all saved objects, because it needs to make assumptions about the current state of saved objects in order to make viable changes to them. At no time should a user be able to do anything the migration system doesn't anticipate.

Security + Migrations
---------
Security needs to apply its own metadata and global mappings for many (and maybe all) saved objects. The implementation of this is in flux.

When Security starts up, it needs to apply these mapping changes. We don't know in advance of the plugin starting up whether we need to write this metadata, so it makes sense that it happens on startup. Security should own these mappings.

However, the security plugin doesn't have to update all the saved objects when it starts up. It should handle a lack of metadata, the lack of a Space id, and data pertaining to OLS. Saved Objects can go through an ownership claiming phase, where they start out where anyone can access them; then an app can claim ownership of some objects, and OLS metadata gets applied to them. Additionally, if an object has no `space_id`, it and all its child objects are globally available. (Implementation here may change.)

In the current world, Security deals directly with Elasticsearch mappings, applying those mappings directly into the `.kibana` index. Essentially we're allowing the type details to leak into the security plugin from the current saved objects client. Our saved object details leak outside of their abstractions because that's the only way to make real changes to them, in Elasticsearch.

The new Saved Object System needs to solve the problem of leaky abstractions and not allow any consumer to make changes to Kibana-managed indices directly via Elasticsearch--all consumers should pass through the Saved Object System or one of its services or clients.

Canvas example using Security + Migrations
---------
Canvas has a new workpad type. Consider this scenario. X-Pack Security starts up and applies the OLS metadata. Canvas starts up and adds a new field in Canvas's current version of itself. Canvas applies new mappings for all canvas workpads. Now the OLS mappings for canvas workpads are gone. So should Security re-apply its mapping changes after all the plugins are done making changes?

Either way, a plugin version change that triggers Migrations could break the saved object mappings.

This is the case because both OLS and Migrations are making changes to the same Elasticsearch mappings. What if we could have a protective mechanism within the new Saved Objects System that gracefully handles mapping changes before they are committed to Elasticsearch?

We need a mapping abstraction for Kibana saved objects. Maybe the initial definition of a saved object _is_ its mapping abstraction. Maybe something else.

A proper _order in which plugins make changes_ could solve the problem of clobbering mappings, before they get applied on the Elasticsearch side.

This order may or may not be related to the dependency tree we build up internally during the plugin startup phase of the new platform. During this phase all plugin dependencies are analyzed so that plugins can be loaded in dependency order.

Tags
---------
Tagging is a new feature that enables applying some tags across objects, unrelated to a specific type. Maybe other plugins opt into this feature, or maybe the plugin only lives in X-Pack. Maybe tags have to be applied to all saved objects and the tagging features chooses how to expose them. Either way, modifications to underlying objects are applied broadly. The tagging features _can tag any type_, but it cannot know about _all the types that need to be tagged_.

The same kind of clobbering of mappings could happen if Security and Migrations made changes to mappings along with Tagging. You could still ultimately lose data unless all are brought together into the same system.

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

The three client model
---------
The migrations client and saved object client probably share important internal details.

The plugin contract exposes some extension points that give you the migration client or give you the saved object client.

Each plugin can configure that it depends on these two clients, and they are made available from the saved object service, which is exposed on probably Kibana core.

The different things we want plugins to configure for saved objects:

**Migrations.** The plugin provides a function which takes in a migration client, and that client exposes a `registerMigration` function that takes in a name and an action to run, for example.

**Http service.** The plugin system could wire itself into the Http service, so every single handler gets pre-seeded with the relevant information from the request to map to a Kibana user so we can do auth for OLS.

Hmmmm. This is the thing I think we should do more cleanly. There's a way to provide the relevant information without passing in the huge request object to middleware, and without exposing the `getSavedObjectsClient` on the server object or the request object. Register an endpoint along with the handler for that endpoint. Define the handler to explicitly pass headers from the request to the saved object client factory, which then provides a client bound to those headers.

For example, define a plugin that has only dependencies on Kibana core, and no other plugin dependencies.

```js
// baz/index.js
import { KibanaPluginConfig } from '@kbn/types';
import { registerEndpoints } from './register_endpoints';

export const plugin: KibanaPluginConfig<{}> = {
  plugin: kibana => {
    // Grab components you need from Kibana core
    const { elasticsearch, logger, http } = kibana;
    const config$ = kibana.kibana.config$;

    const log = logger.get();

    log.info('create Baz plugin');

    // Register a router upon which to attach handlers
    const router = http.createAndRegisterRouter('/api/baz');

    log.info('register Baz endpoints');

    // Start defining handlers
    registerEndpoints(router, logger, elasticsearch.service, config$);
  },
};

```

Registering an endpoint lets you define what to expect from the request, validating those parts of the request, and how to handle the request. The handler can define a Saved Object Client

```js
// baz/register_endpoints.js
export function registerEndpoints(
  router:        Router,
  logger:        LoggerFactory,
  elasticsearch: ElasticsearchService,
  config$:       Observable<KibanaConfig>
) {
  const log = logger.get('routes');

  // Example of what happens when an endpoint fails on validation
  router.get(
    {
      path: '/fail',
      validate: false,
    },
    async (req, res) => {
      log.info(`GET should fail`);

      return res.badRequest(new Error('nope'));
    }
  );

  // Example of an endpoint that validates
  router.get(
    {
      path: '/:type',
      // schema lib can be injected
      validate: schema => ({
        params: schema.object({
          type: schema.string(),
        }),
        query: schema.object({
          page: schema.maybe(
            schema.number({
              min: 1,
            })
          ),
          per_page: schema.maybe(
            schema.number({
              min: 1,
            })
          ),
        }),
      }),
    },
    // handler is just like normal middleware
    async (req, res) => {
      log.info('handle Baz route');

      // the only things available on request because only what's validated is offered
      const { params, query } = req;

      log.info('create Baz Service instance');

      // Example of using a Data Client scoped to a request, given its headers
      const client = await elasticsearch.getScopedDataClient(req.headers);

      // Initialize a service that this plugin needs
      // using the Elasticsearch client that access the right cluster,
      // and that is scoped correctly (to the user)
      const bazService = new BazService(client, config$);

      log.info('use Baz Service instance to hit elasticsearch with the right cluster');

      // bazService defines find() method that calls client.call(`endpoint`, params)
      // Behind the scenes, the saved object client executes the call with OLS
      const items = await bazService.find({
        type: params.type,
        page: query.page,
        perPage: query.per_page,
      });

      return res.ok(items);
    }
  );
}
```

BazService is just a backend service that the plugin defines. It can use the saved objects client to do stuff.

```js
// baz/BazService.js
export class BazService {
  // BazService has private members ScopedDataClient and config
  constructor(
    private readonly client: ScopedDataClient,
    private readonly kibanaConfig$: Observable<KibanaConfig>
  ) {}

  // Define a simple find method
  async find(options: { type: string; page?: number; perPage?: number }) {
    const { page = 1, perPage = 20, type } = options;

    const [kibanaIndex] = await latestValues(
      k$(this.kibanaConfig$)(map(config => config.index))
    );

    // Use the ScopedDataClient to make the request
    const response = await this.client.call('endpoint', {
      index: kibanaIndex,
      type,
      size: perPage,
      from: perPage * (page - 1),
    });

    const data = response.hits.hits.map((hit: any) => ({
      id: hit._id,
      type: hit._type,
      version: hit._version,
      attributes: hit._source,
    }));

    return {
      data,
      total: response.hits.total,
      per_page: perPage,
      page: page,
    };
  }
}
```

To see an implementation of ElasticsearchService and the different ways we can provide Elasticsearch via an Admin or Data Client, peruse [this directory](https://github.com/elastic/kibana/tree/new-platform/platform/src/server/elasticsearch).

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

