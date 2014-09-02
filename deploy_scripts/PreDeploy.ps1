function Add-ServerRole
{
  param([string] $roleToAdd)
  
  Write-Host "looking for server role: $roleToAdd"
  $searchResult = Get-WindowsFeature $roleToAdd
  
  if($searchResult.Installed -eq $false)
  {
	Write-Host "Adding server role: $roleToAdd"
	Add-WindowsFeature $roleToAdd
  }
}

function Add-IISMimeType
{
  param(
    [Parameter(Mandatory=$true)][string] $mimeType,
    [Parameter(Mandatory=$true)][string] $mimeFileExtension
  )
  Import-Module WebAdministration
  
  $mimePresent =  get-webconfigurationproperty //staticContent -name collection | Where { $_.mimeType -eq $mimeType -And $_.fileExtension -eq $mimeFileExtension }
  
  if ( $mimePresent -eq $null)
  {
  	add-webconfigurationproperty //staticContent -name collection -value @{fileExtension=$mimeFileExtension; mimeType=$mimeType}
  	Write-Host "MimeType added to IIS: '$mimeType', '$mimeFileExtension'"
  }
  else
  {
  	Write-Host "MimeType allready present in IIS: '$mimeType', '$mimeFileExtension'"
  }
}

function Remove-Site
{
	param([string] $webSite)

	$site = dir IIS:\sites | Where-Object { $_.name -eq $webSite } | Select Name | Select-Object -first 1
	$pool = dir IIS:\AppPools | Where-Object { $_.name -eq $webSite } | Select Name | Select-Object -first 1

	if($site)
	{
		$siteName = $site.Name
		Write-Host "  - Stopping site: $siteName"
		Stop-WebSite -Name "$siteName" -ErrorAction:SilentlyContinue
		Write-Host "  - Removing site: $siteName"
		Remove-WebSite -Name "$siteName"
	}

	if($pool)
	{
		$poolName = $pool.Name
		Write-Host "  - Stopping AppPool: $poolName"
		Stop-WebAppPool -Name "$poolName" -ErrorAction:SilentlyContinue
		Write-Host "  - Removing AppPool: $poolName"
		Remove-WebAppPool -Name "$poolName"
	}
}

Import-Module Servermanager
Add-ServerRole Application-Server
Add-ServerRole Web-Server

Import-Module WebAdministration

Remove-Site "Default Web Site"

Add-IISMimeType "application/json" ".json"
