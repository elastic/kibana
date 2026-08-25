## Encrypted Saved Object Model Version Example

This plugin provides a simple use case demonstration of:
 - How to organize versioned saved object and encryption registration definitions
 - How to use the createModelVersion wrapper function of the Encrypted Saved Objects plugin
 - How/when encrypted model versions are migrated and what to expect when they are queried

This is an example plugin to demonstrate implementation of an encrypted saved object with model versions using the new encryptedSavedObjectsPlugin.createModelVersion API.

A good place to start is by reviewing the definitions in `examples/eso_model_version_example/server/types`. This is where the interfaces and constants that for the example saved object are defined.

In `examples/eso_model_version_example/server/plugin.ts` the model versions are defined, which include typical changes you might see in a saved object over time only in this case the model version definitions are wrapped by the new createModelVersion API.

Lastly, use the plugin UI to get a sense for how the objects are migrated - you can query the raw documents and then decrypted the migrated objects.

To run this example, use the command `yarn start --run-examples`.
