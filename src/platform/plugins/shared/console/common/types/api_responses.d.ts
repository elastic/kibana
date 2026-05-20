export interface EsConfigApiResponse {
    /**
     * This is the first host in the hosts array that Kibana is configured to use
     * to communicate with ES.
     *
     * At the moment this is used to power the copy as cURL functionality in Console
     * to complete the host portion of the URL.
     */
    host?: string;
    /**
     * List of all configured Elasticsearch hosts from elasticsearch.hosts
     */
    allHosts?: string[];
}
