export const TRYCLOUD_OPTION1 = {
  title: 'Option 1: Try module in Elastic Cloud',
  textPre: 'Go to [Elastic Cloud](https://cloud.elastic.co/). Register if you ' +
           'don\'t have an account.\n' +
           ' * Select **Create Cluster**, leave size slider at 4 GB RAM, and click **Create**.\n' +
           ' * Wait for the cluster plan to complete.\n' +
           ' * Go to the new Cloud Kibana instance and follow the Kibana Home instructions.'

};

export const TRYCLOUD_OPTION2 = {
  title: 'Option 2: Connect local Kibana to a Cloud instance',
  textPre: 'If you are running this Kibana instance against a hosted Elasticsearch instance,' +
           ' proceed with manual setup.\n\n' +
           'In **Overview >> Endpoints** note **Elasticsearch** as `<es_url>`.'
};
