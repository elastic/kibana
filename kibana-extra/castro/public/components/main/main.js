import React from "react";
import {
  EuiPage,
  EuiPageHeader,
  EuiTitle,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentBody,
  EuiText,
  EuiDescriptionList,
  EuiAccordion,
  EuiCodeBlock,
  EuiSpacer
} from "@elastic/eui";

export class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      commitInfo: [],
      entries: []
    };
  }

  componentDidMount() {
    /* 
       FOR EXAMPLE PURPOSES ONLY.  There are much better ways to
       manage state and update your UI than this.
    */
    const { httpClient } = this.props;
    httpClient.get("../api/castro/example").then((resp) => {
      const data = resp.data;
      const commitInfo = [
        {
          title: "Commit",
          description: data.commit
        },
        {
          title: "Date",
          description: data.date
        },
        {
          title: "Committer",
          description: data.committer
        },
        {
          title: "Message",
          description: data.message
        }
      ]

      this.setState({ commitInfo, entries: data.entries  });
    });  
  }
  render() {
    const { title } = this.props;
    return (
      <EuiPage>
        <EuiPageHeader>
          <EuiTitle size="l">
            <h1>{title} Hello World!</h1>
          </EuiTitle>
        </EuiPageHeader>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentHeader>
              <EuiTitle>
                <h2>Current Commit</h2>
              </EuiTitle>
            </EuiPageContentHeader>
            <EuiPageContentBody>
              <EuiDescriptionList
                type="column"
                listItems={this.state.commitInfo}
                style={{ maxWidth: '800px' }}
              />
              <EuiSpacer size="xl"/>
              <EuiTitle>
                <h2>Changed files</h2>
              </EuiTitle>
              <EuiSpacer size="xs"/>
              {
                this.state.entries.map((entry,idx) => 
                  <EuiAccordion
                    id={"fid"+ idx}
                    key={"fid"+ idx}
                    buttonContent={entry.path}
                  >   
                  <EuiCodeBlock language="javascript">
                    {entry.blob}
                  </EuiCodeBlock>

                  </EuiAccordion>
                )
              }
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
  
};
