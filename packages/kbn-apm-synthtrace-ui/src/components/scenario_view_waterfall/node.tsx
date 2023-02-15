import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiText,
  EuiPopover,
  EuiButton,
} from '@elastic/eui';
import React, { useState } from 'react';
import { useScenarioContext } from '../../context/use_scenario_context';
import { Span, Service, Transaction, ModalType } from '../../typings';
import { AgentIcon } from '../agent_icon';

const Node = ({ item, level }: { item: Transaction | Span | Service; level: number }) => {
  const shouldDisplayActions = !(item as Service).agentName;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { dispatch } = useScenarioContext();

  const onButtonClick = () => setIsPopoverOpen((isPopoverOpen) => !isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const onPopOverOptionSelected = (type: ModalType) => {
    dispatch({
      type: 'toggle_create_modal',
      payload: {
        isOpen: true,
        type,
        id: item.id,
        serviceId: (item as Transaction | Span).serviceId,
      },
    });
    setIsPopoverOpen(false);
  };

  return (
    <EuiFlexGroup>
      {!shouldDisplayActions && (
        <EuiFlexItem grow={false}>
          <AgentIcon agentName={(item as Service).agentName} size="l" />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText style={{ display: 'flex', paddingLeft: `${level * 30}px` }}>{item.name}</EuiText>
      </EuiFlexItem>
      {shouldDisplayActions && (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={<EuiButtonIcon onClick={onButtonClick} iconType="plus" aria-label="Add" />}
              isOpen={isPopoverOpen}
              closePopover={closePopover}
            >
              <EuiText>Add New</EuiText>
              <EuiButton fullWidth size="s" onClick={() => onPopOverOptionSelected('transaction')}>
                Transaction
              </EuiButton>
              <EuiButton fullWidth size="s" onClick={() => onPopOverOptionSelected('span')}>
                Span
              </EuiButton>
              <EuiButton fullWidth size="s" onClick={() => onPopOverOptionSelected('service')}>
                Service
              </EuiButton>
            </EuiPopover>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon onClick={() => {}} iconType="gear" aria-label="Add" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiFlexGroup>
  );
};

export default Node;
