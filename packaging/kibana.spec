Summary:       Custom LogRhythm kibana
Name:          kibana
Version:       %{version}
Release:       1%{?dist}
License:       https://github.com/elastic/kibana/blob/master/licenses/APACHE-LICENSE-2.0.txt
Group:         Development/Tools
URL:           https://github.com/elastic/kibana
Source:        https://github.com/elastic/kibana
Requires:      python-elasticsearch >= 1.9.0
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
tar xzf %_sourcedir/%{name}-%{version}.tar.gz
if [ $? -ne 0 ]; then
   exit $?
fi

%build
#installs dependencies and runs the build
cd %{name}
/usr/local/bin/yarn
/usr/local/bin/yarn kbn bootstrap
node scripts/build --rpm --oss --skip-archives --release --verbose

%install
cd %{name}
mkdir -p %{buildroot}/lib/systemd/system
cp systemd/kibana.service %{buildroot}/lib/systemd/system

mkdir -p %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64
cp -a build/oss/%{name}-%{kibana_version}-linux-x86_64/* %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/

mkdir -p %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/exportAssets.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/setDefaultIndex.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/loadAssets.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/util.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts

mkdir -p %{buildroot}/usr/local/www/probe/
ln -sf /usr/local/%{name}-%{kibana_version}-linux-x86_64 %{buildroot}/usr/local/www/probe/%{name}-%{kibana_version}-linux-x86_64

%post
/usr/bin/systemctl enable kibana.service

%files
%defattr(-,nginx,nginx,-)
/usr/local/www/probe/
/usr/local/%{name}-%{kibana_version}-linux-x64
%attr(0644,root,root) /lib/systemd/system/kibana.service
