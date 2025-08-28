import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiButtonIcon } from '@elastic/eui';

export interface DemoControlsBarProps {
  canManageSpaces: boolean;
  setCanManageSpaces: (value: boolean) => void;
  isTrial: boolean;
  setIsTrial: (value: boolean) => void;
  hideFullCallout: boolean;
  setHideFullCallout: (value: boolean) => void;
  onResetToClassic: () => void;
  showHideFullSwitch?: boolean;
}

export const DemoControlsBar: React.FC<DemoControlsBarProps> = ({
  canManageSpaces,
  setCanManageSpaces,
  isTrial,
  setIsTrial,
  hideFullCallout,
  setHideFullCallout,
  onResetToClassic,
  showHideFullSwitch = true,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        backgroundColor: '#222222',
        color: '#ffffff',
        borderRadius: '24px',
        padding: '8px 24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '240px',
      }}
    >
      <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="center" responsive={false}>
        {showHideFullSwitch && (
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label="Hide in-page"
              checked={hideFullCallout}
              onChange={(e) => setHideFullCallout(e.target.checked)}
              compressed
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Privileges"
            checked={canManageSpaces}
            onChange={(e) => setCanManageSpaces(e.target.checked)}
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Trial"
            checked={isTrial}
            onChange={(e) => setIsTrial(e.target.checked)}
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            onClick={onResetToClassic}
            aria-label="Reset to Classic view with default demo state"
            title="Reset to Classic view with default demo state"
            size="s"
            display="fill"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
