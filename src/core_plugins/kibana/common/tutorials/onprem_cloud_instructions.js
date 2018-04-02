export const TRYCLOUD_OPTION1 = {
  title: 'Option 1: Try module in Elastic Cloud',
  textPre: 'Go to [Elastic Cloud](https://www.elastic.co/cloud/as-a-service/signup?blade=kib). Register if you ' +
           'don\'t have an account.\n' +
           ' 1. Select **Create Cluster**, leave size slider at 4 GB RAM, and click **Create**.\n' +
           ' 2. Wait for the cluster plan to complete.\n' +
           ' 3. Go to the new Cloud Kibana instance and follow the Kibana Home instructions.'

};

export const TRYCLOUD_OPTION2 = {
  title: 'Option 2: Connect local Kibana to a Cloud instance',
  textPre: 'If you are running this Kibana instance against a hosted Elasticsearch instance,' +
           ' proceed with manual setup.\n\n' +
           'In **Overview > Endpoints**, note **Elasticsearch** as `<es_url>`.'
};
