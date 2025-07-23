import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import type { AuthenticatedUser, CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import { WorkflowExecution } from '@kbn/workflows-management-plugin/public';
import * as yaml from 'js-yaml';
import React, { useCallback, useEffect, useState } from 'react';
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
          setCurrentUser(user);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    };

    getCurrentUser();
  }, [services.security]);

  const validateAndSetWorkflow = (workflow: string) => {
    try {
      yaml.load(workflow);
      setIsValidWorkflow(true);
    } catch (error) {
      setIsValidWorkflow(false);
    }
    setWorkflow(workflow);
  };

  // Use React hooks to manage state.
  const [stringWorkflow, setWorkflow] = useState<string>(
    yaml.dump({
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
          type: 'console.log',
          with: {
            message: 'Step 1 executed "{{event.ruleName}}"',
          },
        },
        {
          id: 'step-with-slow-console',
          type: 'console.sleep',
          with: {
            sleepTime: 1000,
            message: 'Step 2 executed "{{event.additionalData.userName}}"',
          },
        },
        {
          id: 'step-with-slack-connector',
          needs: ['step1', 'step2'],
          type: 'slack-connector',
          'connector-id': 'slack_keep',
          with: {
            message:
              'Message from step 1: Detection rule name is "{{event.ruleName}}" and user is "{{event.additionalData.userName}}" and workflowRunId is "{{workflowRunId}}" and time now is {{ now() }}',
          },
        },
      ],
    })
  );

  // Update workflow inputs with current user email
  const getWorkflowInputs = useCallback(() => {
    const userEmail = currentUser?.email || 'workflow-user@gmail.com';
    const userName = currentUser?.username || 'workflow-user';
    return yaml.dump({
      event: {
        ruleName: 'Detect vulnerabilities',
        additionalData: {
          user: userEmail,
          userName,
        },
      },
    });
  }, [currentUser]);
  const [workflowInputs, setWorkflowInputs] = useState<string>(getWorkflowInputs());
  const [isValidWorkflow, setIsValidWorkflow] = useState<boolean>(true);

  // Update workflow inputs when current user changes
  useEffect(() => {
    setWorkflowInputs(getWorkflowInputs());
  }, [currentUser, getWorkflowInputs]);

  const [workflowExecutionId, setWorkflowExecutionId] = useState<string | null>(null);

  const onClickHandler = () => {
    // Use the core http service to make a response to the server API.
    http
      .post('/api/workflows/run', {
        body: JSON.stringify({
          workflow: yaml.load(stringWorkflow),
          inputs: yaml.load(workflowInputs),
        }),
      })
      .then((res: any) => {
        setWorkflowExecutionId(res.workflowExecutionId);
        // Use the core notifications service to display a success message.
        notifications.toasts.addSuccess(
          i18n.translate('workflowsExample.dataUpdated', {
            defaultMessage: 'Workflow Executed',
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
                          languageId="yaml"
                          value={workflowInputs}
                          height={200}
                          editorDidMount={() => {}}
                          onChange={setWorkflowInputs}
                          suggestionProvider={undefined}
                          dataTestSubj={'workflow-inputs-json-editor'}
                          options={{
                            readOnly: true,
                            language: 'yaml',
                          }}
                          readOnlyMessage="You cannot edit the event sent to the workflow."
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
                          languageId="yaml"
                          value={stringWorkflow}
                          height={500}
                          editorDidMount={() => {}}
                          onChange={validateAndSetWorkflow}
                          suggestionProvider={undefined}
                          dataTestSubj={'workflow-json-editor'}
                          options={{
                            language: 'yaml',
                          }}
                        />
                      </div>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    type="submit"
                    size="s"
                    onClick={onClickHandler}
                    disabled={!isValidWorkflow}
                  >
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
