import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import {
  EuiButton,
  EuiPageTemplate,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { WorkflowExecution } from '@kbn/workflows-management-plugin/public';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { PLUGIN_NAME } from '../../common';

interface WorkflowsAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}

export const WorkflowsApp = ({ basename, notifications, http, navigation }: WorkflowsAppDeps) => {
  const theme = useEuiTheme();
  // Use React hooks to manage state.
  const [stringWorkflow, setWorkflow] = useState<string>(
    JSON.stringify(
      {
        id: 'example-workflow-1',
        name: 'Example Workflow 1',
        status: 'active',
        triggers: [
          {
            id: 'detection-rule',
            type: 'detection-rule',
            enabled: true,
            config: {},
          },
        ],
        steps: [
          {
            id: 'step-with-console-log-1',
            connectorType: 'console',
            connectorName: 'console',
            inputs: {
              message: 'Step 1 executed "{{event.ruleName}}"',
            },
          },
          {
            id: 'step-with-slow-console',
            connectorName: 'slow-console',
            connectorType: 'console',
            inputs: {
              message: 'Step 2 executed "{{event.additionalData.user}}"',
            },
          },
          {
            id: 'step-with-slack-connector',
            needs: ['step1', 'step2'],
            connectorType: 'slack-connector',
            connectorName: 'slack_keep',
            inputs: {
              message:
                'Message from step 3: Detection rule name is "{{event.ruleName}}" and user is "{{event.additionalData.user}}" and workflowRunId is "{{workflowRunId}}"',
            },
          },
          {
            id: 'step-with-console-log-2',
            needs: ['step3'],
            connectorName: 'console',
            connectorType: 'console',
            inputs: {
              message: 'Step 4 executed!',
            },
          },
          {
            id: 'step-with-5-seconds-delay',
            connectorName: 'delay',
            connectorType: 'delay',
            inputs: {
              delay: 5000,
            },
          },
        ],
      },
      null,
      4
    )
  );
  const [workflowInputs, setWorkflowInputs] = useState<string>(
    JSON.stringify(
      {
        event: {
          ruleName: 'Detect vulnerabilities',
          additionalData: {
            user: 'workflow-user@gmail.com',
          },
        },
      },
      null,
      4
    )
  );
  const [workflowExecutionId, setWorkflowExecutionId] = useState<string | null>(null);

  const onClickHandler = () => {
    // Use the core http service to make a response to the server API.
    http
      .post('/api/workflows/run', {
        body: JSON.stringify({
          workflow: JSON.parse(stringWorkflow),
          inputs: JSON.parse(workflowInputs),
        }),
      })
      .then((res: any) => {
        console.log('Workflow run response:', res);
        setWorkflowExecutionId(res.workflowExecutionId);
        // Use the core notifications service to display a success message.
        notifications.toasts.addSuccess(
          i18n.translate('workflowsExample.dataUpdated', {
            defaultMessage: 'Data updated',
          })
        );
      });
  };

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <EuiPageTemplate restrictWidth="1000px">
            <EuiPageTemplate.Header>
              <EuiTitle size="l">
                <h1>
                  <FormattedMessage
                    id="workflowsExample.helloWorldText"
                    defaultMessage="{name}"
                    values={{ name: PLUGIN_NAME }}
                  />
                </h1>
              </EuiTitle>
            </EuiPageTemplate.Header>
            <EuiPageTemplate.Section restrictWidth={false}>
              <EuiTitle>
                <h2>
                  <FormattedMessage
                    id="workflowsExample.congratulationsTitle"
                    defaultMessage="Enter workflow inputs, workflow body, and click Run! Have fun!"
                  />
                </h2>
              </EuiTitle>
              <EuiFlexGroup
                gutterSize="l"
                direction="row"
                css={{
                  position: 'relative',
                }}
                responsive={false}
              >
                <EuiFlexItem
                  css={css`
                    max-width: 1000px;
                    position: relative;
                  `}
                >
                  <EuiFlexGroup direction="column" gutterSize="l">
                    <EuiFlexItem>
                      <div
                        css={{
                          border: `1px solid ${theme.euiTheme.colors.borderBaseFormsColorSwatch}`,
                        }}
                      >
                        <CodeEditor
                          languageId="json"
                          value={workflowInputs}
                          height={200}
                          editorDidMount={() => {}}
                          onChange={setWorkflowInputs}
                          suggestionProvider={undefined}
                          dataTestSubj={'workflow-inputs-json-editor'}
                        />
                      </div>
                    </EuiFlexItem>
                    <EuiFlexItem
                      css={css`
                        max-width: 100%;
                        position: relative;
                      `}
                    >
                      <div
                        css={{
                          border: `1px solid ${theme.euiTheme.colors.borderBaseFormsColorSwatch}`,
                        }}
                      >
                        <CodeEditor
                          languageId="json"
                          value={stringWorkflow}
                          height={500}
                          editorDidMount={() => {}}
                          onChange={setWorkflow}
                          suggestionProvider={undefined}
                          dataTestSubj={'workflow-json-editor'}
                        />
                      </div>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton type="submit" size="s" onClick={onClickHandler}>
                    <FormattedMessage
                      id="workflowsExample.buttonText"
                      defaultMessage="Run workflow"
                      ignoreTag
                    />
                  </EuiButton>
                  {workflowExecutionId && (
                    <WorkflowExecution workflowExecutionId={workflowExecutionId} />
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageTemplate.Section>
          </EuiPageTemplate>
        </>
      </I18nProvider>
    </Router>
  );
};
