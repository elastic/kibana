import React from 'react';

import {
  KuiFieldGroup,
  KuiFieldGroupSection,
  KuiButton,
  KuiButtonIcon,
  KuiButtonGroup,
} from '../../../../components';

export default () => (
  <div>
    <KuiFieldGroup>
      <KuiFieldGroupSection isWide>
        <div className="kuiSearchInput">
          <div className="kuiSearchInput__icon kuiIcon fa-search" />
          <input
            className="kuiSearchInput__input"
            type="text"
          />
        </div>
      </KuiFieldGroupSection>

      <KuiFieldGroupSection>
        <select className="kuiSelect">
          <option>Animal</option>
          <option>Mineral</option>
          <option>Vegetable</option>
        </select>
      </KuiFieldGroupSection>
    </KuiFieldGroup>

    <br className="guideBreak"/>

    <KuiFieldGroup>
      <KuiFieldGroupSection>
        <input
          className="kuiTextInput"
          placeholder="http://"
          type="text"
        />
      </KuiFieldGroupSection>

      <KuiFieldGroupSection>
        <KuiButton buttonType="primary">
          Ping
        </KuiButton>
      </KuiFieldGroupSection>
    </KuiFieldGroup>

    <br className="guideBreak"/>

    <KuiFieldGroup isAlignedTop>
      <KuiFieldGroupSection>
        <textarea
          className="kuiTextArea"
          placeholder="http://"
          type="text"
          rows="5"
        />
      </KuiFieldGroupSection>

      <KuiFieldGroupSection>
        <KuiButton buttonType="primary">
          Ping
        </KuiButton>
      </KuiFieldGroupSection>
    </KuiFieldGroup>

    <br className="guideBreak"/>

    <KuiFieldGroup>
      <KuiFieldGroupSection>
        <input
          className="kuiTextInput"
          type="text"
        />
      </KuiFieldGroupSection>

      <KuiFieldGroupSection>
        <KuiButtonGroup>
          <KuiButton
            buttonType="basic"
            className="kuiButton--small"
            aria-label="Increase"
            icon={<KuiButtonIcon className="fa-plus" />}
          />

          <KuiButton
            buttonType="basic"
            className="kuiButton--small"
            aria-label="Decrease"
            icon={<KuiButtonIcon className="fa-minus" />}
          />

          <KuiButton
            buttonType="danger"
            className="kuiButton--small"
            aria-label="Remove"
            icon={<KuiButtonIcon className="fa-trash" />}
          />
        </KuiButtonGroup>
      </KuiFieldGroupSection>
    </KuiFieldGroup>
  </div>
);
