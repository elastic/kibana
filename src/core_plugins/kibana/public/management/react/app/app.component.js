import React, { Component } from 'react';
import {
  KuiPage,
  KuiPageBody,
  KuiPageHeader,
  KuiPageHeaderSection,
  KuiPageSideBar,
  KuiTitle,
  KuiSideNav,
  KuiSideNavItem,
  KuiSideNavTitle,
  KuiLink,
} from 'ui_framework/components';

class SideBar extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isSideNavOpenOnMobile: false,
    };
  }

  toggleOpenOnMobile() {
    this.setState({
      isSideNavOpenOnMobile: !this.state.isSideNavOpenOnMobile,
    });
  }

  render() {
    const sections = this.props.sections.map((section, idx) => {
      if (section.visibleItems.length === 0) {
        return null;
      }

      const items = section.visibleItems.map((item, idx) => {
        const url = item.url ? item.url.substring(1) : null;
        return (
          <KuiSideNavItem key={idx}>
            <KuiLink href={`#${url}`}>
              {item.display}
            </KuiLink>
          </KuiSideNavItem>
        );
      });

      return (
        <div key={idx}>
          <KuiSideNavTitle>
            {section.display}
          </KuiSideNavTitle>
          {items}
        </div>
      );

    });

    return (
      <KuiSideNav
        mobileTitle="Navigate within Management"
        toggleOpenOnMobile={this.toggleOpenOnMobile.bind(this)}
        isOpenOnMobile={this.state.isSideNavOpenOnMobile}
      >
        {sections}
      </KuiSideNav>
    );
  }
}

const App = ({ /*version,*/ sections, children }) => {
  return (
    <KuiPage>
      <KuiPageHeader>
        <KuiPageHeaderSection>
          <KuiTitle size="large">
            <h1>Management</h1>
          </KuiTitle>
        </KuiPageHeaderSection>
        <KuiPageHeaderSection>
          Page abilities
        </KuiPageHeaderSection>
      </KuiPageHeader>
      <KuiPageBody>
        <KuiPageSideBar>
          <SideBar sections={sections}/>
        </KuiPageSideBar>
        {children}
      </KuiPageBody>
    </KuiPage>
  );
};

export { App };
