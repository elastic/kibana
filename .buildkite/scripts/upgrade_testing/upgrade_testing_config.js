module.exports = (version) => ({
  "resources": {
    "elasticsearch": [
      {
        "region": "azure-eastus2",
        "settings": {
          "dedicated_masters_threshold": 6
        },
        "plan": {
          "autoscaling_enabled": false,
          "cluster_topology": [
            {
              "zone_count": 2,
              "instance_configuration_id": "azure.coordinating.d64sv3",
              "node_roles": [
                "ingest",
                "remote_cluster_client"
              ],
              "id": "coordinating",
              "size": {
                "resource": "memory",
                "value": 0
              },
              "elasticsearch": {
                "enabled_built_in_plugins": []
              }
            },
            {
              "zone_count": 1,
              "elasticsearch": {
                "node_attributes": {
                  "data": "hot"
                },
                "enabled_built_in_plugins": []
              },
              "instance_configuration_id": "azure.data.highio.l32sv2",
              "node_roles": [
                "master",
                "ingest",
                "transform",
                "data_hot",
                "remote_cluster_client",
                "data_content"
              ],
              "id": "hot_content",
              "size": {
                "value": 1024,
                "resource": "memory"
              }
            },
            {
              "zone_count": 2,
              "elasticsearch": {
                "node_attributes": {
                  "data": "warm"
                },
                "enabled_built_in_plugins": []
              },
              "instance_configuration_id": "azure.data.highstorage.e16sv3",
              "node_roles": [
                "data_warm",
                "remote_cluster_client"
              ],
              "id": "warm",
              "size": {
                "resource": "memory",
                "value": 0
              }
            },
            {
              "zone_count": 1,
              "elasticsearch": {
                "node_attributes": {
                  "data": "cold"
                },
                "enabled_built_in_plugins": []
              },
              "instance_configuration_id": "azure.data.highstorage.e16sv3",
              "node_roles": [
                "data_cold",
                "remote_cluster_client"
              ],
              "id": "cold",
              "size": {
                "resource": "memory",
                "value": 0
              }
            },
            {
              "zone_count": 1,
              "elasticsearch": {
                "node_attributes": {
                  "data": "frozen"
                },
                "enabled_built_in_plugins": []
              },
              "instance_configuration_id": "azure.es.datafrozen.lsv2",
              "node_roles": [
                "data_frozen"
              ],
              "id": "frozen",
              "size": {
                "resource": "memory",
                "value": 0
              }
            },
            {
              "zone_count": 3,
              "instance_configuration_id": "azure.master.e32sv3",
              "node_roles": [
                "master",
                "remote_cluster_client"
              ],
              "id": "master",
              "size": {
                "resource": "memory",
                "value": 0
              },
              "elasticsearch": {
                "enabled_built_in_plugins": []
              }
            },
            {
              "zone_count": 1,
              "instance_configuration_id": "azure.ml.d64sv3",
              "node_roles": [
                "ml",
                "remote_cluster_client"
              ],
              "id": "ml",
              "size": {
                "resource": "memory",
                "value": 0
              },
              "elasticsearch": {
                "enabled_built_in_plugins": []
              }
            }
          ],
          "elasticsearch": {
            "version": version
          },
          "deployment_template": {
            "id": "azure-io-optimized-v3"
          }
        },
        "ref_id": "main-elasticsearch"
      }
    ],
    "enterprise_search": [],
    "kibana": [
      {
        "elasticsearch_cluster_ref_id": "main-elasticsearch",
        "region": "azure-eastus2",
        "plan": {
          "cluster_topology": [
            {
              "instance_configuration_id": "azure.kibana.e32sv3",
              "zone_count": 1,
              "size": {
                "resource": "memory",
                "value": 1024
              }
            }
          ],
          "kibana": {
            "version": version,
            "user_settings_yaml": "csp.strict: false"
          }
        },
        "ref_id": "main-kibana"
      }
    ],
    "apm": [
      {
        "elasticsearch_cluster_ref_id": "main-elasticsearch",
        "region": "azure-eastus2",
        "plan": {
          "cluster_topology": [
            {
              "instance_configuration_id": "azure.apm.e32sv3",
              "zone_count": 1,
              "size": {
                "resource": "memory",
                "value": 1024
              }
            }
          ],
          "apm": {
            "version": version
          }
        },
        "ref_id": "main-apm"
      }
    ]
  },
  "name": "My deployment",
  "metadata": {
    "system_owned": false
  }
})
