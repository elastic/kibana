import * as React from 'react';
import { useState } from 'react';
import injectSheet, { WithSheet } from 'react-jss';
import Button from '@logrhythm/webui/components/Button';
import Modal from '@logrhythm/webui/components/Modal';

const modalConfigsForActions = {
  restart: {
    title: 'Restart Network Monitor Services',
    body: 'Are you sure you want to restart Network Monitor services?',
    close: () => undefined,
    closeBtnMsg: 'Restart Services',
  },
  reboot: {
    title: 'Reboot Network Monitor',
    body: 'Are you sure you want to reboot the system?',
    close: () => undefined,
    closeBtnMsg: 'Reboot Now',
  },
  shutdown: {
    title: 'Shutdown Network Monitor',
    body: (
      <>
        <strong>**WARNING**</strong> You are about to power off your Network Monitor server. You
        will have to physically power the system back on to regain connectivity.
        <br />
        <br />
        Are you <strong>sure</strong> you want to <strong>shutdown the server?</strong>
      </>
    ),
    close: () => undefined,
    closeBtnMsg: 'Shutdown Now',
  },
};

const styles = {
  manageMachineMenuWrapper: {
    display: 'inline-block',
  },
  modalClass: {
    width: '75vw',
  },
};

type InjectedProps = WithSheet<typeof styles, {}>;

const ManageMachineMenu = (props: InjectedProps) => {
  const { classes } = props;

  const [requestedActionKey, setRequestedActionKey] = useState<
    keyof typeof modalConfigsForActions | null
  >(null);

  const requestedActionModalConfig = requestedActionKey
    ? modalConfigsForActions[requestedActionKey]
    : null;

  const { title = '', body = '', close = () => undefined, closeBtnMsg = '' } =
    requestedActionModalConfig || {};

  const triggerModalClose = () => setRequestedActionKey(null);
  const handleModalConfirm = () => {
    close();
    setRequestedActionKey(null);
  };

  return (
    <div className={classes.manageMachineMenuWrapper}>
      <li className="dropdown nav-item">
        <a
          id="slider-dropdown"
          className="nav-link pointer"
          data-toggle="dropdown"
          role="button"
          aria-haspopup="true"
          aria-expanded="false"
        >
          <span
            className="icon-administration header-icon"
            title="Administration"
            aria-hidden="true"
          >
            <span className="icon-down" />
          </span>
        </a>
        <ul className="dropdown-menu dropdown-menu-right" aria-labelledby="slider-dropdown">
          <a className="dropdown-item" href="#" onClick={() => setRequestedActionKey('restart')}>
            <i className="fa fa-refresh" aria-hidden="true" />
            Restart Netmon&nbsp;
          </a>
          <a className="dropdown-item" href="#" onClick={() => setRequestedActionKey('reboot')}>
            <i className="fa fa-history" aria-hidden="true" />
            Reboot&nbsp;
          </a>
          <a className="dropdown-item" href="#" onClick={() => setRequestedActionKey('shutdown')}>
            <i className="fa fa-power-off" aria-hidden="true" />
            Shutdown&nbsp;
          </a>
        </ul>
      </li>
      <Modal
        isOpen={!!requestedActionModalConfig}
        dialogClass={classes.modalClass}
        title={<h4>{title}</h4>}
        body={body}
        footer={
          <>
            <Button type="primary" onClick={handleModalConfirm}>
              {closeBtnMsg}
            </Button>
            <Button type="secondary" onClick={triggerModalClose}>
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

export default injectSheet(styles)(ManageMachineMenu);
