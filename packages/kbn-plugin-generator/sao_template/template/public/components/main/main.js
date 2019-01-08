import React from 'react';
import {
  EuiPage,
  EuiPageHeader,
  EuiTitle,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentBody,
  EuiText
} from '@elastic/eui';
<%_ if (generateTranslations) { _%>
import { FormattedMessage } from '@kbn/i18n/react';
<%_ } _%>

export class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    /*
       FOR EXAMPLE PURPOSES ONLY.  There are much better ways to
       manage state and update your UI than this.
    */
    const { httpClient } = this.props;
    httpClient.get('../api/<%= name %>/example').then((resp) => {
      this.setState({ time: resp.data.time });
    });
  }
  render() {
    const { title } = this.props;
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageHeader>
            <EuiTitle size="l">
              <h1>
                <%_ if (generateTranslations) { _%>
                <FormattedMessage
                  id="<%= camelCase(name) %>.helloWorldText"
                  defaultMessage="{title} Hello World!"
                  values={{ title }}
                />
                <%_ } else { _%>
                {title} Hello World!
                <%_ } _%>
              </h1>
            </EuiTitle>
          </EuiPageHeader>
          <EuiPageContent>
            <EuiPageContentHeader>
              <EuiTitle>
                <h2>
                  <%_ if (generateTranslations) { _%>
                  <FormattedMessage
                    id="<%= camelCase(name) %>.congratulationsTitle"
                    defaultMessage="Congratulations"
                  />
                  <%_ } else { _%>
                    Congratulations
                  <%_ } _%>
                </h2>
              </EuiTitle>
            </EuiPageContentHeader>
            <EuiPageContentBody>
              <EuiText>
                <h3>
                  <%_ if (generateTranslations) { _%>
                  <FormattedMessage
                    id="<%= camelCase(name) %>.congratulationsText"
                    defaultMessage="You have successfully created your first Kibana Plugin!"
                  />
                  <%_ } else { _%>
                    You have successfully created your first Kibana Plugin!
                  <%_ } _%>
                </h3>
                <p>
                  <%_ if (generateTranslations) { _%>
                  <FormattedMessage
                    id="<%= camelCase(name) %>.serverTimeText"
                    defaultMessage="The server time (via API call) is {time}"
                    values={{ time: this.state.time || 'NO API CALL YET' }}
                  />
                  <%_ } else { _%>
                    The server time (via API call) is {this.state.time || 'NO API CALL YET'}
                  <%_ } _%>
                </p>
              </EuiText>
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
