# Links CM v1

The links content management state in v1 is the same as the saved object attributes for links.

An `up` transform on the `cmServiceDefinition` methods and the `embeddableVersionableObject` in `./cm_services.ts` provides a function to inject references into the attributes to be forward compatible with `v2`. 

Similarly `down` transform functions are provided on the `v2` module to extract references for backward compatibility with `v1`.
