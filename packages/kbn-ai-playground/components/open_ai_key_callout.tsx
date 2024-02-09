import { EuiButton, EuiCallOut } from "@elastic/eui";
import { css } from "@emotion/react";
import { i18n } from "@kbn/i18n";

import React, { Dispatch, SetStateAction } from "react";

interface ListProps {
  setIsOpenAIFlyOutOpen: Dispatch<SetStateAction<boolean>>;
}

export const OpenAIKeyCallout: React.FC<ListProps> = ({ setIsOpenAIFlyOutOpen }: ListProps) => {
  return (
    <EuiCallOut
      css={css`
        width: 55%
      `}
      title={i18n.translate(
        'aiPlayground.sidebar.openAICallout.headerText',
        {
          defaultMessage: 'Add OpenAI API Key',
        }
      )}
      color="warning" 
      iconType="warning"
    >
      <p>
        {i18n.translate(
          'aiPlayground.sidebar.openAICallout.description',
          {
            defaultMessage: 'The AI Playground uses OpenAl models for summarization. Add your OpenAI API key to continue.',
          }
        )}
      </p>
      <EuiButton
        onClick={() => setIsOpenAIFlyOutOpen(true)} 
        color="warning"
        fill
        data-test-subj="openaiflyout-open"
      >
        {i18n.translate(
          'aiPlayground.sidebar.openAICallout.buttonLabelText',
          {
            defaultMessage: 'Add OpenAI API Key',
          }
        )}
      </EuiButton>
    </EuiCallOut>
  );
};
