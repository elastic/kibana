---
navigation_title: "Map settings"
mapped_pages:
  - https://www.elastic.co/guide/en/cloud/current/ec-manage-kibana-settings.html#ec_map_settings
applies_to:
  deployment:
    ess: all
---

# Map settings in {{kib}}

`map.regionmap` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Specifies additional vector layers for use in [Region Map](docs-content://explore-analyze/visualize/maps/maps-getting-started.md) visualizations. Each layer object points to an external vector file that contains a geojson FeatureCollection. The file must use the [WGS84 coordinate reference system](https://en.wikipedia.org/wiki/World_Geodetic_System) and only include polygons. If the file is hosted on a separate domain from Kibana, the server needs to be CORS-enabled so Kibana can download the file. The following example shows a valid regionmap configuration.

    ```yaml
    map.regionmap:
      includeElasticMapsService: false
      layers:
        - name: "Departments of France"
          url: "<MY_CORS_ENABLED_SERVER_URL>/france_departements.geojson"
          attribution:   "INRAP"
          fields:
            - name: "department"
              description: "Full department name"
            - name: "INSEE"
              description: "INSEE numeric identifier"
    ```


`map.regionmap.includeElasticMapsService` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Turns on or off whether layers from the Elastic Maps Service should be included in the vector layer option list. Supported on Elastic Cloud Enterprise. By turning this off, only the layers that are configured here will be included. The default is `true`.

`map.regionmap.layers[].attribution` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Optional. References the originating source of the geojson file.

`map.regionmap.layers[].fields[]` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Mandatory. Each layer can contain multiple fields to indicate what properties from the geojson features you wish to expose. The previous example shows how to define multiple properties.

`map.regionmap.layers[].fields[].description` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Mandatory. The human readable text that is shown under the Options tab when building the Region Map visualization.

`map.regionmap.layers[].fields[].name` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Mandatory. This value is used to do an inner-join between the document stored in Elasticsearch and the geojson file. For example, if the field in the geojson is called `Location` and has city names, there must be a field in Elasticsearch that holds the same values that Kibana can then use to lookup for the geoshape data.

`map.regionmap.layers[].name` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Mandatory. A description of the map being provided.

`map.regionmap.layers[].url` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Mandatory. The location of the geojson file as provided by a webserver.

`tilemap.options.attribution` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Adds the map attribution string.

`tilemap.options.maxZoom` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Sets the maximum zoom level.

`tilemap.options.minZoom` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Sets the minimum zoom level.

`tilemap.options.subdomains` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Provides an array of subdomains used by the tile service. Specify the position of the subdomain the URL with the token `{{s}}`.

`tilemap.url` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Lists the URL to the tileservice that Kibana uses to display map tiles in tilemap visualizations.
