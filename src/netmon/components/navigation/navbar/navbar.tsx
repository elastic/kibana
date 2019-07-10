import * as React from 'react';
import classnames from 'classnames';
import injectSheet, { WithSheet } from 'react-jss';
import { useLogoUrl } from '../../../hooks/applicationHooks';
import { useAdminStatus, useLoggedInStatus, useLicensedStatus } from '../../../hooks/authHooks';
import { Tab } from '../typings';
import AnalyzeMenu from './analyze_menu';
import HelpMenu from './help_menu';
import ManageMachineMenu from './manage_machine_menu';
import { alarmsTab, analyzeTab, basicTabs } from './navigation_tabs';
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
};

export type Props = {
  onTabSelected?: (tab: Tab) => void;
};

type InjectedProps = Props & WithSheet<typeof styles, {}>;

const Navbar = (props: InjectedProps) => {
  const { classes, onTabSelected = () => undefined } = props;

  const logoUrl = useLogoUrl();
  const isLoggedIn = useLoggedInStatus();
  const isLicensed = useLicensedStatus();
  const isAdmin = useAdminStatus();

  const isLoggedInAndLicensed = isLoggedIn && isLicensed;

  return (
    <div className={classnames(classes.navbarMain, 'Day', 'nm-section')}>
      <nav className="navbar navbar-fixed-top">
        <a className="navbar-brand" href="" onClick={() => onTabSelected(analyzeTab)}>
          {!!logoUrl && <img alt="Brand" src={logoUrl} />}
        </a>

        {isLoggedInAndLicensed && (
          <>
            <ul className="nav navbar-nav">
              <AnalyzeMenu />

              <li id={`tab_${alarmsTab.id}`} className="dropdown nav-item">
                <a className="nav-link pointer" href={alarmsTab.path}>
                  {alarmsTab.display}
                </a>
              </li>

              {basicTabs.map(tab => (
                <li key={`tab_${tab.id}`} id={`tab_${tab.id}`} className={'dropdown nav-item'}>
                  <a className="nav-link" href={tab.path}>
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
    </div>
  );
};

export default injectSheet(styles)(Navbar);
