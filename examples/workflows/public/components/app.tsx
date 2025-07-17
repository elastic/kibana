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
import * as yaml from 'js-yaml';

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

  const validateAndSetWorkflow = (workflow: string) => {
    try {
      yaml.load(workflow);
      setIsValidWorkflow(true);
    } catch (error) {
      setIsValidWorkflow(false);
    }
    setWorkflowYaml(workflow);
  };

  // Use React hooks to manage state.
  const [workflowYaml, setWorkflowYaml] = useState<string>(
    `
workflow:
  name: New workflow
  enabled: false
  triggers:
    - type: triggers.elastic.manual
  steps:
    - name: step-with-console-log-1
      type: console
      connector-id: console
      with:
        message: Step 1 executed for rule"{{event.ruleName}}"
    
    - name: slack-connector-step
      type: slack.sendMessage
      connector-id: keep-playground
      with:
        message: |
          Hello from Kibana!
          The user name from event is {{event.additionalData.userName}} and email is {{event.additionalData.user}}

    - name: step-with-5-seconds-delay
      type: delay
      connector-id: delay
      with:
        delay: 5000
    `
  );

  // Update workflow inputs with current user email
  const getWorkflowInputs = () => {
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
  };
  const [workflowInputs, setWorkflowInputs] = useState<string>(getWorkflowInputs());
  const [isValidWorkflow, setIsValidWorkflow] = useState<boolean>(true);

  // Update workflow inputs when current user changes
  useEffect(() => {
    setWorkflowInputs(getWorkflowInputs());
  }, [currentUser]);

  const [workflowExecutionId, setWorkflowExecutionId] = useState<string | null>(null);

  const onClickHandler = () => {
    // Use the core http service to make a response to the server API.
    http
      .post('/api/workflows/test', {
        body: JSON.stringify({
          workflowYaml: workflowYaml,
          inputs: yaml.load(workflowInputs),
        }),
      })
      .then((res: any) => {
        console.log('Workflow run response:', res);
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
                          value={workflowYaml}
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
                    <WorkflowExecution
                      workflowExecutionId={workflowExecutionId}
                      workflowYaml={workflowYaml}
                    />
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
