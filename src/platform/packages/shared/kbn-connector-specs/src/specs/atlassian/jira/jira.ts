import { ConnectorSpec } from '@kbn/connector-specs';
import { i18n } from '@kbn/i18n';
import { z } from 'zod/v4';

export const JiraConnector: ConnectorSpec = {
  metadata: {
    id: '.jira',
    displayName: 'Jira',
    description: i18n.translate('core.kibanaConnectorSpecs.jira.metadata.description', {
      defaultMessage: 'Connect to Jira to pull data from your project.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },
  auth: {
    types: ['basic'],
  },
  schema: z.object({
    subdomain: z
      .string()
      .min(1)
      .describe(
        i18n.translate('core.kibanaConnectorSpecs.jira.config.subdomain.description', {
          defaultMessage: 'Your Atlassian subdomain',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.jira.config.subdomain.label', {
          defaultMessage: 'Subdomain',
        }),
        placeholder: 'your-domain',
        helpText: i18n.translate('core.kibanaConnectorSpecs.jira.config.subdomain.helpText', {
          defaultMessage:
            'The subdomain for your Jira Cloud site (e.g. your-domain for https://your-domain.atlassian.com)',
        }),
      }),
  }),
  actions: {
    searchIssuesWithJql: {
      isTool: false,
      input: z.object({
        jql: z.string(),
      }),
      handler: async (ctx, input) => {
        const subdomain = (ctx.config?.subdomain as string) ?? '';
        const baseUrl = `https://${subdomain.trim()}.atlassian.net`;
        const response = await ctx.client.post(`${baseUrl}/rest/api/3/search/jql`, input);
        return response.data;
      },
    },
  },
};
