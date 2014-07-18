/** @scratch /configuration/config.js/1
 * == Configuration
 * config.js is where you will find the core Kibana configuration. This file contains parameter that
 * must be set before kibana is run for the first time.
 */

/** @scratch /configuration/config.js/2
 * === Parameters
 */
define(function () {
  return {
    /** @scratch /configuration/config.js/5
     * ==== elasticsearch
     *
     * The URL to your elasticsearch server. You almost certainly don't
     * want +http://localhost:9200+ here. Even if Kibana and Elasticsearch are on
     * the same host. By default this will attempt to reach ES at the same host you have
     * kibana installed on. You probably want to set it to the FQDN of your
     * elasticsearch host
     */
    // elasticsearch: 'http://' + location.hostname + ':9200',

    /** @scratch /configuration/config.js/5
     * ==== kibana-int
     *
     * The default ES index to use for storing Kibana specific object
     * such as stored dashboards
     */
    kibanaIndex: 'kibana4-int',

    /**
     * A list of apps that can be loaded by Kibana. The id's need to match the
     * directory name in which the app lives, ie. src/kibana/apps/{{id}}
     * @type {Array}
     */
    apps: [
      { id: 'discover', name: 'Discover' },
      { id: 'visualize', name: 'Visualize' },
      { id: 'dashboard', name: 'Dashboard' },
      { id: 'settings', name: 'Settings' }
    ],

    defaultAppId: 'discover'
  };
});