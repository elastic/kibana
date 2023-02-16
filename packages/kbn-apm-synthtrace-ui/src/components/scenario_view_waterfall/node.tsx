import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiText,
  EuiPopover,
  EuiButton,
  EuiBadge,
  EuiPanel,
} from '@elastic/eui';
import React, { useState } from 'react';
import { useScenarioContext } from '../../context/use_scenario_context';
import { Span, Transaction, ModalType } from '../../typings';

const Node = ({ item, level }: { item: Transaction | Span; level: number }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { dispatch, state } = useScenarioContext();

  const onButtonClick = () => setIsPopoverOpen((isPopoverOpen) => !isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const onPopOverOptionSelected = (type: ModalType) => {
    dispatch({
      type: 'toggle_modal_form',
      payload: {
        isOpen: true,
        type,
        id: item.id,
        serviceId: item.serviceId,
        isEdit: false,
      },
    });
    setIsPopoverOpen(false);
  };

  const onEdit = (type: ModalType) => {
    dispatch({
      type: 'toggle_modal_form',
      payload: {
        isOpen: true,
        type,
        id: item.id,
        serviceId: item.serviceId,
        isEdit: true,
      },
    });
  };

  const shouldRepeat = item?.repeat ? item.repeat > 0 : false;

  let panelColor = '#fff';

  if (state.services) {
    panelColor = state.services[item.serviceId]?.color;
  }

  return (
    <EuiFlexGroup
      style={{
        display: 'flex',
        paddingLeft: `${level * 30}px`,
        marginBottom: '10px',
      }}
    >
      <EuiPanel paddingSize="s" style={{ backgroundColor: `${panelColor}` }}>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiText>
              <EuiBadge style={{ marginRight: 8 }}>{item.docType.charAt(0).toUpperCase()}</EuiBadge>
              {item.name}
            </EuiText>
          </EuiFlexItem>
          {shouldRepeat && (
            <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
              <EuiBadge color="green">{item.repeat}x</EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={<EuiButtonIcon onClick={onButtonClick} iconType="plus" aria-label="Add" />}
                isOpen={isPopoverOpen}
                closePopover={closePopover}
              >
                <EuiText>Add New</EuiText>
                <EuiButton
                  fullWidth
                  size="s"
                  onClick={() => onPopOverOptionSelected('transaction')}
                >
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
              <EuiButtonIcon
                onClick={() => onEdit(item.docType)}
                iconType="gear"
                aria-label="Edit"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexGroup>
  );
};

export default Node;
