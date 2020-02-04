# Copyright 2020 LogRhythm, Inc
# Licensed under the LogRhythm Global End User License Agreement,
# which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/

Summary:       Custom LogRhythm kibana
Name:          kibana
Version:       %{version}
Release:       1%{?dist}
License:       https://github.com/elastic/kibana/blob/master/licenses/APACHE-LICENSE-2.0.txt
Group:         Development/Tools
URL:           https://github.com/elastic/kibana
Source:        https://github.com/elastic/kibana
Requires:      python >= 2.7.5, python-requests, python-chardet
Requires(post): systemd

%description
Kibana build for LogRhythm NetMon

%prep
#cleanup
cd %_builddir
rm -rf %{name}
mkdir %{name}
cd %{name}

#extract sources
tar xf %_sourcedir/%{name}-%{version}.tar
if [ $? -ne 0 ]; then
   exit $?
fi

#extract dlumbrer/kbn_network plugin, following the renaming and file modification steps from github repo
#unzip -q resources/plugins/kbn_network*.zip -d plugins/
#if [ $? -ne 0 ]; then
#   echo "Exiting build. Could not unzip plugin."
#   exit 1
#fi
#mv plugins/kbn_network* plugins/network_vis
#rm -rf plugins/network_vis/images/

%build
#must install kibana dependencies before running build due to a `yarn kbn bootstrap` bug that strips auth
cd %{name}
/usr/bin/yarn

#plugin has a package.json that must also be installed before running build
#cd plugins/network_vis/
/usr/bin/yarn

#run the build
#cd ../../
/usr/bin/yarn kbn bootstrap
node scripts/build --rpm --oss --skip-archives --release --verbose

%install
cd %{name}
mkdir -p %{buildroot}/lib/systemd/system
cp systemd/kibana.service %{buildroot}/lib/systemd/system

mkdir -p %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64
cp -a build/oss/%{name}-%{kibana_version}-linux-x86_64/* %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/
cp -a resources/ %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/

mkdir -p %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/exportAssets.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/configureKibana.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/util.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
#cp -a plugins/ %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/

mkdir -p %{buildroot}/usr/local/www/probe/
ln -sf /usr/local/%{name}-%{kibana_version}-linux-x86_64 %{buildroot}/usr/local/www/probe/%{name}-%{kibana_version}-linux-x86_64

%post
/usr/bin/systemctl enable kibana.service

%files
%defattr(-,nginx,nginx,-)
/usr/local/www/probe/
/usr/local/%{name}-%{kibana_version}-linux-x64
%attr(0644,root,root) /lib/systemd/system/kibana.service
