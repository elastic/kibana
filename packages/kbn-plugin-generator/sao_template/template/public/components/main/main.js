import React from "react";
import {
  EuiPage,
  EuiPageHeader,
  EuiTitle,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentBody,
  EuiText
} from "@elastic/eui";

export const Main = ({ title, currentTime }) => {
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
              <h2>Congratulations</h2>
            </EuiTitle>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiText>
              <h3>You've successfully created your first Kibana Plugin!</h3>
              <p>The current time is {currentTime}</p>
            </EuiText>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
