import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCodeBlock,
  EuiFieldText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { Popover } from '../popover';
import { Clipboard } from '../clipboard';

export class WorkpadExport extends React.PureComponent {
  static propTypes = {
    enabled: PropTypes.bool.isRequired,
    onCopy: PropTypes.func.isRequired,
    onExport: PropTypes.func.isRequired,
    getExportUrl: PropTypes.func.isRequired,
  };

  exportPdf = () => {
    this.props.onExport('pdf');
  };

  renderControls = closePopover => {
    const pdfUrl = this.props.getExportUrl('pdf');
    return (
      <div>
        Export this workpad as a PDF. You'll be notified when the PDF is complete.
        <EuiSpacer />
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => {
                this.exportPdf();
                closePopover();
              }}
            >
              Export as PDF
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule size="half" />
        To generate a PDF from a script or with Watcher, use this URL.
        <EuiSpacer />
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFieldText aria-label="PDF Generation URL" value={pdfUrl} readOnly />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Clipboard
              content={pdfUrl}
              onCopy={() => {
                this.props.onCopy('pdf');
                closePopover();
              }}
            >
              <EuiButtonIcon aria-label="Copy to clipboard" iconType="copy" />
            </Clipboard>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  };

  renderDisabled = () => {
    return (
      <div>
        Export to PDF is disabled. You must configure reporting to use the Chromium browser. Add
        this to your kibana.yml file.
        <EuiSpacer />
        <EuiCodeBlock paddingSize="s" language="yml">
          xpack.reporting.capture.browser.type: chromium
        </EuiCodeBlock>
      </div>
    );
  };

  render() {
    const exportControl = togglePopover => (
      <EuiButtonIcon iconType="exportAction" aria-label="Create PDF" onClick={togglePopover} />
    );

    return (
      <Popover button={exportControl} tooltip="Export workpad" tooltipPosition="bottom">
        {({ closePopover }) => (
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false} style={{ maxWidth: '300px' }}>
              {this.props.enabled && this.renderControls(closePopover)}
              {!this.props.enabled && this.renderDisabled()}
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </Popover>
    );
  }
}
