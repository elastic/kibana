import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ESQLEditor } from '../esql_editor';

const Template = (args) => (
  <I18nProvider>
    <KibanaContextProvider
      services={{
        settings: { client: { get: () => {} } },
        uiSettings: { get: () => {} },
      }}
    >
      <ESQLEditor {...args} />
    </KibanaContextProvider>
  </I18nProvider>
);

export default {
  title: 'Text based languages editor',
  component: ESQLEditor,
};

export const ExpandedMode = {
  render: Template.bind({}),
  name: 'expanded mode',

  args: {
    query: {
      esql: 'from dataview | keep field1, field2',
    },

    'data-test-subj': 'test-id',
  },

  argTypes: {
    onTextLangQueryChange: {
      action: 'changed',
    },

    onTextLangQuerySubmit: {
      action: 'submitted',
    },
  },
};

export const WithErrors = {
  render: Template.bind({}),
  name: 'with errors',

  args: {
    query: {
      esql: 'from dataview | keep field1, field2',
    },

    'data-test-subj': 'test-id',

    errors: [
      new Error(
        '[essql] > Unexpected error from Elasticsearch: verification_exception - Found 1 problem line 1:16: Unknown column [field10]'
      ),
    ],
  },

  argTypes: {
    onTextLangQueryChange: {
      action: 'changed',
    },

    onTextLangQuerySubmit: {
      action: 'submitted',
    },
  },
};
