import * as React from 'react';
import { useCallback, useEffect } from 'react';
import classnames from 'classnames';
import injectSheet, { WithSheet } from 'react-jss';
import Events from '../../../services/Events';
import { useLogoUrl } from '../../../hooks/application_hooks';
import { useCurrentUser } from '../../../hooks/auth_hooks';
import { useEvent } from '../../../hooks/event_hooks';
import { Tab } from '../typings';
import AnalyzeMenu from './analyze_menu';
import HelpMenu from './help_menu';
import ManageMachineMenu from './manage_machine_menu';
import { alarmsTab, analyzeTab, basicTabs } from './navigation_tabs';
import NotificationDisplay from './notification_display';
import { checkLicenseStatus, checkPasswordStatus, checkTimeInSync } from './notification_handlers';
import UserMenu from './user_menu';

import 'tether';
import 'bootstrap';

const styles = {
  navbarMain: {
    '& .navbar': {
      minWidth: '1066px',
    },
    '& .navbar-right': {
      minWidth: '154px',
      paddingLeft: '40px',
      '& .dropdown.nav-item': {
        marginRight: '3px',
      },
    },
    '& .navbar-nav': {
      minWidth: '662px',
    },
    '& .nav-link': {
      fontSize: '14px',
    },
    '& a.nav-link:hover': {
      backgroundColor: 'transparent',
    },
    '& a.nav-link:focus': {
      animation: 'none',
      backgroundColor: 'transparent',
    },
    '& .navbarMarginBottom': {
      marginBottom: '1.5rem',
    },
    '& .navbar-brand': {
      marginTop: '1.4rem',
    },
    '& .navbar-brand:focus': {
      animation: 'none',
      backgroundColor: 'transparent',
    },
    '& button': {
      display: 'inline-block',
      background: '0 0',
      border: 'none',
    },
    '& .header-icon': {
      marginTop: '1rem',
      padding: '5px 0px',
      whiteSpace: 'nowrap',
      fontSize: '21px',
      color: '#666666',
    },
    '& .header-icon:hover': {
      color: '#000',
    },
    '& .icon-down': {
      fontSize: '5px',
      verticalAlign: 'middle',
      paddingLeft: '2px',
      paddingRight: '5px',
      lineHeight: 1,
    },
    '& .dropdown-item': {
      cursor: 'pointer',
      '& i.fa': {
        marginRight: '.25rem',
      },
    },
    '& .alert-bar-margin .alert': {
      marginBottom: '0rem',
    },
    '& .alert-danger .alert-link': {
      color: '#fff',
    },
    '& .username': {
      cursor: 'default',
    },
    '& a.dropdown-item.username:hover': {
      backgroundColor: '#e6e6e6',
      color: '#4c4c4c',
    },
  },
  notificationWrapper: {
    paddingTop: '3.571rem',
    paddingLeft: '48px',
  },
};

export type Props = {
  onTabSelected?: (tab: Tab) => void;
};

type InjectedProps = Props & WithSheet<typeof styles, {}>;

const Navbar = (props: InjectedProps) => {
  const { classes, onTabSelected = () => undefined } = props;

  const logoUrl = useLogoUrl();
  const currentUser = useCurrentUser();

  const isLicensed = !!currentUser && currentUser.licensed;
  const isLoggedIn = !!currentUser;
  const isAdmin = currentUser && currentUser.role === 'admin';

  const checkTimeInSyncAndLicensed = useCallback(checkTimeInSync(isLicensed), [isLicensed]);
  useEvent(Events.eventNames.licenseCheck, checkLicenseStatus);
  useEvent(Events.eventNames.passwordCheck, checkPasswordStatus);
  useEvent(Events.eventNames.timeSyncCheck, checkTimeInSyncAndLicensed);

  useEffect(
    () => {
      Events.licenseCheck();
      Events.passwordCheck();
      Events.timeSyncCheck();
    },
    [currentUser]
  );

  const isLoggedInAndLicensed = isLoggedIn && isLicensed;

  return (
    <div className="nm-section">
      <div className={classnames(classes.navbarMain, 'Day')}>
        <nav className="navbar navbar-fixed-top">
          <a className="navbar-brand" href="" onClick={() => onTabSelected(analyzeTab)}>
            {!!logoUrl && <img alt="Brand" src={logoUrl} />}
          </a>

          {isLoggedInAndLicensed && (
            <>
              <ul className="nav navbar-nav">
                <AnalyzeMenu />

                <li id={`tab_${alarmsTab.id}`} className="dropdown nav-item">
                  <a
                    id="tab_alarms"
                    data-testid="tab_alarms"
                    className="nav-link pointer"
                    href={alarmsTab.path}
                  >
                    {alarmsTab.display}
                  </a>
                </li>

                {basicTabs.map(tab => (
                  <li key={`tab_${tab.id}`} className={'dropdown nav-item'}>
                    <a
                      id={`tab_${tab.id}`}
                      data-testid={`tab_${tab.id}`}
                      className="nav-link"
                      href={tab.path}
                    >
                      {tab.display}
                    </a>
                  </li>
                ))}
              </ul>

              <span className="navbar-gradient" />

              <span className="navbar-right">
                <ul>
                  {isAdmin && <ManageMachineMenu />}
                  <UserMenu />
                  <HelpMenu />
                </ul>
              </span>
            </>
          )}
        </nav>
        <div className={classnames('alert-bar-margin', classes.notificationWrapper)}>
          <NotificationDisplay />
        </div>
      </div>
    </div>
  );
};

export default injectSheet(styles)(Navbar);
