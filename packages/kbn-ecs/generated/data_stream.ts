/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The data_stream fields take part in defining the new data stream naming scheme.
 * In the new data stream naming scheme the value of the data stream fields combine to the name of the actual data stream in the following manner: `{data_stream.type}-{data_stream.dataset}-{data_stream.namespace}`. This means the fields can only contain characters that are valid as part of names of data streams. More details about this can be found in this https://www.elastic.co/blog/an-introduction-to-the-elastic-data-stream-naming-scheme[blog post].
 * An Elasticsearch data stream consists of one or more backing indices, and a data stream name forms part of the backing indices names. Due to this convention, data streams must also follow index naming restrictions. For example, data stream names cannot include `\`, `/`, `*`, `?`, `"`, `<`, `>`, `|`, ` ` (space character), `,`, or `#`. Please see the Elasticsearch reference for additional https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html#indices-create-api-path-params[restrictions].
 */
export interface EcsDataStream {
  /**
   * The field can contain anything that makes sense to signify the source of the data.
   * Examples include `nginx.access`, `prometheus`, `endpoint` etc. For data streams that otherwise fit, but that do not have dataset set we use the value "generic" for the dataset value. `event.dataset` should have the same value as `data_stream.dataset`.
   * Beyond the Elasticsearch data stream naming criteria noted above, the `dataset` value has additional restrictions:
   *   * Must not contain `-`
   *   * No longer than 100 characters
   */
  dataset?: string;
  /**
   * A user defined namespace. Namespaces are useful to allow grouping of data.
   * Many users already organize their indices this way, and the data stream naming scheme now provides this best practice as a default. Many users will populate this field with `default`. If no value is used, it falls back to `default`.
   * Beyond the Elasticsearch index naming criteria noted above, `namespace` value has the additional restrictions:
   *   * Must not contain `-`
   *   * No longer than 100 characters
   */
  namespace?: string;
  /**
   * An overarching type for the data stream.
   * Currently allowed values are "logs" and "metrics". We expect to also add "traces" and "synthetics" in the near future.
   */
  type?: string;
}
