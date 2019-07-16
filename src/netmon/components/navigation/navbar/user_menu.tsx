import * as React from 'react';
import injectSheet, { WithSheet } from 'react-jss';
import Auth from '../../../services/Auth';

const styles = {
  userMenuWrapper: {
    display: 'inline-block',
  },
};

export type Props = {
  username: string;
};

type InjectedProps = Props & WithSheet<typeof styles, {}>;

const UserMenu = (props: InjectedProps) => {
  const { classes, username } = props;

  const signOut = () => {
    Auth.logout();
    window.location.href = '/login';
  };

  return (
    <div className={classes.userMenuWrapper}>
      <li className="dropdown nav-item">
        <a
          id="user-dropdown"
          data-testid="user-dropdown"
          className="nav-link pointer"
          data-toggle="dropdown"
          role="button"
          aria-haspopup="true"
          aria-expanded="false"
        >
          <span className="icon-user header-icon" title="User Options" aria-hidden="true">
            <span className="icon-down" />
          </span>
        </a>
        <ul className="dropdown-menu dropdown-menu-right" aria-labelledby="user-dropdown">
          <a
            data-testid="user-dropdown-username"
            className="dropdown-item username"
            onClick={e => e.stopPropagation()}
          >
            <i className="fa fa-user" aria-hidden="true" />
            {username}
          </a>
          <a
            data-testid="user-dropdown-sign-out"
            className="dropdown-item"
            href="#"
            onClick={signOut}
          >
            <i className="fa fa-sign-out" aria-hidden="true" />
            Sign Out
          </a>
        </ul>
      </li>
    </div>
  );
};

export default injectSheet(styles)(UserMenu);
