import * as React from 'react';
import { useState } from 'react';
import injectSheet, { WithSheet } from 'react-jss';
import classnames from 'classnames';
import Button from '@logrhythm/webui/components/Button';
import Modal from '@logrhythm/webui/components/Modal';

const styles = {
  helpMenuWrapper: {
    display: 'inline-block',
  },
  modalClass: {
    width: '75vw',
  },
};

type InjectedProps = WithSheet<typeof styles, {}>;

const HelpMenu = (props: InjectedProps) => {
  const { classes } = props;

  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  const triggerModalOpen = () => setDownloadModalOpen(true);
  const triggerModalClose = () => setDownloadModalOpen(false);
  const handleModalConfirm = () => {
    window.open('/api/support', '_blank');
    triggerModalClose();
  };

  return (
    <div className={classes.helpMenuWrapper}>
      <li className="dropdown nav-item">
        <a
          id="help-dropdown"
          data-testid="help-dropdown"
          className="nav-link pointer"
          data-toggle="dropdown"
          role="button"
          aria-haspopup="true"
          aria-expanded="false"
        >
          <div className="icons">
            <span className="icon-question header-icon" title="Help" aria-hidden="true">
              <span className="icon-down" />
            </span>
          </div>
        </a>
        <ul className="dropdown-menu dropdown-menu-right" aria-labelledby="user-dropdown">
          <a data-testid="help-dropdown-about" className="dropdown-item" href="/about">
            About NetMon
          </a>
          <a
            data-testid="help-dropdown-help"
            className="dropdown-item"
            target="_blank"
            href="/userDocs/NetworkMonitorHelp.htm"
          >
            NetMon Help
          </a>
          <a
            data-testid="help-dropdown-forum"
            className="dropdown-item"
            target="_blank"
            href="https://community.logrhythm.com/t5/Network-monitor/ct-p/Netmon"
          >
            NetMon Forum
          </a>
          <a
            data-testid="help-dropdown-diagnostics"
            className="dropdown-item"
            href="#"
            onClick={triggerModalOpen}
          >
            Download Diagnostics
          </a>
        </ul>
      </li>
      <Modal
        testid="diagnostics-modal"
        isOpen={downloadModalOpen}
        dialogClass={classnames(classes.modalClass, 'Day', 'nm-section')}
        title={<h4>Download Diagnostics</h4>}
        body={
          <div>
            Download Diagnostics will collect logs, system information, usage information, network
            metadata, and payload information regarding the system and current network traffic.{' '}
            <br />
            <br />
            The zip file is designed to help LogRhythm support, diagnose, and troubleshoot issues
            with a Network Monitor deployment. <br />
            <br />
            If you download the package, it may take up to several minutes to assemble and download
            the zip file through your browser.
          </div>
        }
        footer={
          <>
            <Button testid="diagnostics-modal-download" type="primary" onClick={handleModalConfirm}>
              Download Diagnostics Package
            </Button>
            <Button testid="diagnostics-modal-cancel" type="secondary" onClick={triggerModalClose}>
              Cancel
            </Button>
          </>
        }
        onCloseClick={triggerModalClose}
        onMaskClick={triggerModalClose}
      />
    </div>
  );
};

export default injectSheet(styles)(HelpMenu);
