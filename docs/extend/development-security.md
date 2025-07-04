---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/development-security.html
---

# Security [development-security]

{{kib}} has generally been able to implement security transparently to core and plugin developers, and this largely remains the case. {{kib}} on two methods that the {{es}} `Cluster` provides: `callWithRequest` and `callWithInternalUser`.

`callWithRequest` executes requests against {{es}} using the authentication credentials of the {{kib}} end-user. So, if you log into {{kib}} with the user of `foo` when `callWithRequest` is used, {{kib}} execute the request against {{es}} as the user `foo`. Historically, `callWithRequest` has been used extensively to perform actions that are initiated at the request of {{kib}} end-users.

`callWithInternalUser` executes requests against {{es}} using the internal {{kib}} server user, and has historically been used for performing actions that aren’t initiated by {{kib}} end users; for example, creating the initial `.kibana` index or performing health checks against {{es}}.

However, with the changes that role-based access control (RBAC) introduces, this is no longer cut and dry. {{kib}} now requires all access to the `.kibana` index goes through the `SavedObjectsClient`. This used to be a best practice, as the `SavedObjectsClient` was responsible for translating the documents stored in {{es}} to and from Saved Objects, but RBAC is now taking advantage of this abstraction to implement access control and determine when to use `callWithRequest` versus `callWithInternalUser`.

## Role-based access control [development-rbac]

Role-based access control (RBAC) in {{kib}} relies upon the [application privileges](elasticsearch://reference/elasticsearch/security-privileges.md#application-privileges) that {{es}} exposes. This allows {{kib}} to define the privileges that {{kib}} wishes to grant to users, assign them to the relevant users using roles, and then authorize the user to perform a specific action. This is handled within a secured instance of the `SavedObjectsClient` and available transparently to consumers when using `request.getSavedObjectsClient()` or `savedObjects.getScopedSavedObjectsClient()`.

### {{kib}} Privileges [development-rbac-privileges]

When {{kib}} first starts up, it executes the following `POST` request against {{es}}. This synchronizes the definition of the privileges with various `actions` which are later used to authorize a user:

```js subs=true
POST /_security/privilege
Content-Type: application/json
Authorization: Basic {{kib}} changeme

{
   "kibana-.kibana":{
       "all":{
           "application":"kibana-.kibana",
           "name":"all",
           "actions":[
               "version:7.0.0-alpha1-SNAPSHOT",
               "action:login",
               "action:*"
           ],
           "metadata":{}
       },
       "read":{
           "application":"kibana-.kibana",
           "name":"read",
           "actions":[
               "version:7.0.0-alpha1-SNAPSHOT",
               "action:login",
               "saved_object:dashboard/get",
               "saved_object:dashboard/bulk_get",
               "saved_object:dashboard/find",
               ...
           ],"metadata":{}}
   }
}
```

::::{note}
The application is created by concatenating the prefix of `kibana-` with the value of `kibana.index` from the `kibana.yml`, so different {{kib}} tenants are isolated from one another.

::::



### Assigning {{kib}} Privileges [development-rbac-assigning-privileges]

{{kib}} privileges are assigned to specific roles using the `applications` element. For example, the following role assigns the [all](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md#kibana-privileges-all) privilege at `*` `resources` (which will in the future be used to secure spaces) to the default {{kib}} `application`:

```js
"new_kibana_user": {
   "applications": [
     {
       "application": "kibana-.kibana",
       "privileges": [
         "all"
       ],
       "resources": [
         "*"
       ]
     }
   ]
 }
```

Roles that grant [{{kib}} privileges](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md) should be managed using the [role APIs](https://www.elastic.co/docs/api/doc/kibana/group/endpoint-roles) or the **Management → Security → Roles** page, not directly using the {{es}} [role management API](https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-security). This role can then be assigned to users using the {{es}} [user management APIs](https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-security).


### Authorization [development-rbac-authorization]

The {{es}} [has privileges API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-has-privileges) determines whether the user is authorized to perform a specific action:

```js
POST /_security/user/_has_privileges
Content-Type: application/json
Authorization: Basic foo_read_only_user password

{
   "applications":[
       {
           "application":"kibana-.kibana",
           "resources":["*"],
           "privileges":[
             "saved_object:dashboard/save",
           ]
       }
   ]
}
```

{{es}} checks if the user is granted a specific action. If the user is assigned a role that grants a privilege, {{es}} uses the [{{kib}} privileges](#development-rbac-privileges) definition to associate this with the actions, which makes authorizing users more intuitive and flexible programmatically.

Once we have authorized the user to perform a specific action, we can execute the request using `callWithInternalUser`.



## Plugin feature registration [development-plugin-feature-registration]

If your plugin will be used with {{kib}}'s default distribution, then you have the ability to register the features that your plugin provides. Features are typically apps in {{kib}}; once registered, you can toggle them via Spaces, and secure them via Roles when security is enabled.

### UI Capabilities [_ui_capabilities]

Registering features also gives your plugin access to “UI Capabilities”. These capabilities are boolean flags that you can use to conditionally render your interface, based on the current user’s permissions. For example, you can  hide or disable a Save button if the current user is not authorized.


### Registering a feature [_registering_a_feature]

Feature registration is controlled via the built-in `features` plugin. To register a feature, call `features`'s `registerKibanaFeature` function from your plugin’s `setup` lifecycle function, and provide the appropriate details:

```javascript
setup(core, { features }) {
  features.registerKibanaFeature({
    // feature details here.
  });
}
```


### Feature details [_feature_details]

Registering a feature consists of the following fields. For more information, consult the [feature registry interface](https://github.com/elastic/kibana/blob/master/x-pack/platform/plugins/shared/features/server/feature_registry.ts).

| Field name | Data type | Example | Description |
| --- | --- | --- | --- |
| `id` (required)<br> | `string`<br> | `"sample_feature"`<br> | A unique identifier for your feature. Usually, the ID of your plugin is sufficient.<br> |
| `name` (required)<br> | `string`<br> | `"Sample Feature"`<br> | A human readable name for your feature.<br> |
| `category` (required)<br> | [`AppCategory`](https://github.com/elastic/kibana/blob/master/src/core/packages/application/common/src/app_category.ts)<br> | `DEFAULT_APP_CATEGORIES.kibana`<br> | The `AppCategory` which best represents your feature. Used to organize the display of features within the management screens.<br> |
| `app` (required)<br> | `string[]`<br> | `["sample_app", "kibana"]`<br> | An array of applications this feature enables. Typically, all of your plugin’s apps (from `uiExports`) will be included here.<br> |
| `privileges` (required)<br> | [`KibanaFeatureConfig`](https://github.com/elastic/kibana/blob/master/x-pack/platform/plugins/shared/features/common/kibana_feature.ts).<br> | See [Example 1](#example-1-canvas) and [Example 2](#example-2-dev-tools)<br> | The set of privileges this feature requires to function.<br> |
| `subFeatures` (optional)<br> | [`KibanaFeatureConfig`](https://github.com/elastic/kibana/blob/master/x-pack/platform/plugins/shared/features/common/kibana_feature.ts).<br> | See [Example 3](#example-3-discover)<br> | The set of subfeatures that enables finer access control than the `all` and `read` feature privileges. These options are only available in the Gold subscription level and higher.<br> |
| `scope` (optional)<br> | `string[]`<br> | `["spaces", "security"]`<br> | Default `security`. Scope identifies if feature should appear in both Spaces Visibility Toggles and Security Feature Privileges or only in Security Feature Privileges.<br> |

#### Privilege definition [_privilege_definition]

The `privileges` section of feature registration allows plugins to implement read/write and read-only modes for their applications.

For a full explanation of fields and options, consult the [feature registry interface](https://github.com/elastic/kibana/blob/master/x-pack/platform/plugins/shared/features/server/feature_registry.ts).



### Using UI Capabilities [_using_ui_capabilities]

UI Capabilities are available to your public (client) plugin code. These capabilities are read-only, and are used to inform the UI. This object is namespaced by feature id. For example, if your feature id is “foo”, then your UI Capabilities are stored at `uiCapabilities.foo`. Capabilities can be accessed from your plugin’s `start` lifecycle from the `core.application` service:

```javascript
public start(core) {
  const { capabilities } = core.application;

  const canUserSave = capabilities.foo.save;
  if (canUserSave) {
    // show save button
  }
}
```


### Example 1: Canvas Application [example-1-canvas]

```javascript
public setup(core, { features }) {
  features.registerKibanaFeature({
    id: 'canvas',
    name: 'Canvas',
    category: DEFAULT_APP_CATEGORIES.kibana,
    app: ['canvas', 'kibana'],
    catalogue: ['canvas'],
    privileges: {
      all: {
        savedObject: {
          all: ['canvas-workpad'],
          read: ['index-pattern'],
        },
        ui: ['save'],
      },
      read: {
        savedObject: {
          all: [],
          read: ['index-pattern', 'canvas-workpad'],
        },
        ui: [],
      },
    },
  });
}
```

This shows how the Canvas application might register itself as a {{kib}} feature. Note that it specifies different `savedObject` access levels for each privilege:

* Users with read/write access (`all` privilege) need to be able to read/write `canvas-workpad` saved objects, and they need read-only access to `index-pattern` saved objects.
* Users with read-only access (`read` privilege) do not need to have read/write access to any saved objects, but instead get read-only access to `index-pattern` and `canvas-workpad` saved objects.

Additionally, Canvas registers the `canvas` UI app and `canvas` catalogue entry. This tells {{kib}} that these entities are available for users with either the `read` or `all` privilege.

The `all` privilege defines a single “save” UI Capability. To access this in the UI, Canvas could:

```javascript
public start(core) {
  const { capabilities } = core.application;

  const canUserSave = capabilities.canvas.save;
  if (canUserSave) {
    // show save button
  }
}
```

Because the `read` privilege does not define the `save` capability, users with read-only access will have their `uiCapabilities.canvas.save` flag set to `false`.


### Example 2: Dev Tools [example-2-dev-tools]

```javascript
public setup(core, { features }) {
  features.registerKibanaFeature({
    id: 'dev_tools',
    name: i18n.translate('xpack.features.devToolsFeatureName', {
      defaultMessage: 'Dev Tools',
    }),
    category: DEFAULT_APP_CATEGORIES.management,
    app: ['kibana'],
    catalogue: ['console', 'searchprofiler', 'grokdebugger'],
    privileges: {
      all: {
        api: ['console'],
        savedObject: {
          all: [],
          read: [],
        },
        ui: ['show'],
      },
      read: {
        api: ['console'],
        savedObject: {
          all: [],
          read: [],
        },
        ui: ['show'],
      },
    },
    privilegesTooltip: i18n.translate('xpack.features.devToolsPrivilegesTooltip', {
     defaultMessage:
       'User should also be granted the appropriate Elasticsearch cluster and index privileges',
   }),
  });
}
```

Unlike the Canvas example, Dev Tools does not require access to any saved objects to function. Dev Tools does specify an API endpoint, however. When this is configured, the Security plugin will automatically authorize access to any server API route that is tagged with `access:console`, similar to the following:

```javascript
server.route({
 path: '/api/console/proxy',
 method: 'POST',
 security: {
  authz: {
    requiredPrivileges: ['console'],
  },
 },
 config: {
   handler: async (req, h) => {
     // ...
   }
 }
});
```


### Example 3: Discover [example-3-discover]

Discover takes advantage of subfeature privileges to allow fine-grained access control. In this example, two subfeature privileges are defined: "Create Short URLs", and "Generate PDF Reports". These allow users to grant access to this feature without having to grant the `all` privilege to Discover. In other words, you can grant `read` access to Discover, and also grant the ability to create short URLs or generate PDF reports.

Notice the "Generate PDF Reports" subfeature privilege has an additional `minimumPrivilege` option. Kibana will only offer this subfeature privilege if the license requirement is satisfied.

```javascript
public setup(core, { features }) {
  features.registerKibanaFeature({
    {
      id: 'discover',
      name: i18n.translate('xpack.features.discoverFeatureName', {
        defaultMessage: 'Discover',
      }),
      order: 100,
      category: DEFAULT_APP_CATEGORIES.kibana,
      app: ['kibana'],
      catalogue: ['discover'],
      privileges: {
        all: {
          app: ['kibana'],
          catalogue: ['discover'],
          savedObject: {
            all: ['search', 'query'],
            read: ['index-pattern'],
          },
          ui: ['show', 'save', 'saveQuery'],
        },
        read: {
          app: ['kibana'],
          catalogue: ['discover'],
          savedObject: {
            all: [],
            read: ['index-pattern', 'search', 'query'],
          },
          ui: ['show'],
        },
      },
      subFeatures: [
        {
          name: i18n.translate('xpack.features.ossFeatures.discoverShortUrlSubFeatureName', {
            defaultMessage: 'Short URLs',
          }),
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'url_create',
                  name: i18n.translate(
                    'xpack.features.ossFeatures.discoverCreateShortUrlPrivilegeName',
                    {
                      defaultMessage: 'Create Short URLs',
                    }
                  ),
                  includeIn: 'all',
                  savedObject: {
                    all: ['url'],
                    read: [],
                  },
                  ui: ['createShortUrl'],
                },
              ],
            },
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'pdf_generate',
                  name: i18n.translate(
                    'xpack.features.ossFeatures.discoverGeneratePDFReportsPrivilegeName',
                    {
                      defaultMessage: 'Generate PDF Reports',
                    }
                  ),
                  minimumLicense: 'platinum',
                  includeIn: 'all',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  api: ['generatePDFReports'],
                  ui: ['generatePDFReports'],
                },
              ],
            },
          ],
        },
      ],
    }
  });
}
```



