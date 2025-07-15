// We need to adjust the whole workflow schema here to the actual workflow schema
// https://docs.google.com/document/d/1c4cyLIMTzEYn9XxDFwrNSmFpVJVLavRVM9DOa_HI9w8
import React, { useState, useEffect } from 'react';
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
import type { AuthenticatedUser, CoreStart } from '@kbn/core/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { WorkflowExecution } from '@kbn/workflows-management-plugin/public';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PLUGIN_NAME } from '../../common';

interface WorkflowsAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}

export const WorkflowsApp = ({ basename, notifications, http, navigation }: WorkflowsAppDeps) => {
  const theme = useEuiTheme();
  const { services } = useKibana();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        if (services.security) {
          const user = await services.security.authc.getCurrentUser();
          console.log(user);
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    };

    getCurrentUser();
  }, [services.security]);

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
              message: 'Step 2 executed "{{event.additionalData.userName}}"',
            },
          },
          {
            id: 'step-with-slack-connector',
            needs: ['step1', 'step2'],
            connectorType: 'slack-connector',
            connectorName: 'slack_keep',
            inputs: {
              message:
                'Message from step 1: Detection rule name is "{{event.ruleName}}" and user is "{{event.additionalData.userName}}" and workflowRunId is "{{workflowRunId}}" and time now is {{ now() }}',
            },
          },
          {
            id: 'step-with-console-log-2',
            needs: ['step3'],
            connectorName: 'console',
            connectorType: 'console',
            inputs: {
              message: 'Message from step 2: And this is the second step at {{ now() }}',
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

  // Update workflow inputs with current user email
  const getWorkflowInputs = () => {
    const userEmail = currentUser?.email || 'workflow-user@gmail.com';
    const userName = currentUser?.username || 'workflow-user';
    return JSON.stringify(
      {
        event: {
          ruleName: 'Detect vulnerabilities',
          additionalData: {
            user: userEmail,
            userName,
          },
        },
      },
      null,
      4
    );
  };
  const [workflowInputs, setWorkflowInputs] = useState<string>(getWorkflowInputs());

  // Update workflow inputs when current user changes
  useEffect(() => {
    setWorkflowInputs(getWorkflowInputs());
  }, [currentUser]);

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
